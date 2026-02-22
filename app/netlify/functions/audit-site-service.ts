import { runSiteAuditCrawler } from './audit-site-crawler'
import {
  claimOldestQueuedJob,
  failStuckRunningJobs,
  finalizeSiteAuditJob,
  getMaxJobsPerWorker,
  getPrimaryRunningJob,
  markJobFailed,
  releaseClaimedJob,
  syncJobCounters
} from './audit-site-persistence'
import {
  formatCategorizedError,
  logJson,
  truncateText
} from './audit-site-observability'
import { clampNumber, type SupabaseAdminClient } from './audit-site-types'

declare const process: {
  env: Record<string, string | undefined>
}

const STUCK_JOB_TIMEOUT_MS = clampNumber(
  process.env.AUDIT_SITE_STUCK_JOB_TIMEOUT_MS,
  60_000,
  24 * 60 * 60 * 1_000,
  20 * 60 * 1_000
)

const getStaleBeforeIso = () => new Date(Date.now() - STUCK_JOB_TIMEOUT_MS).toISOString()

const canWorkerProcessClaimedJob = async (supabase: SupabaseAdminClient, claimedJobId: string) => {
  const running = await getPrimaryRunningJob(supabase)
  if (!running?.id) return true
  return running.id === claimedJobId
}

export const processQueuedSiteAuditJobs = async (
  supabase: SupabaseAdminClient,
  options?: { maxJobs?: number }
) => {
  const maxJobs = clampNumber(options?.maxJobs, 1, 10, getMaxJobsPerWorker())
  const staleFailed = await failStuckRunningJobs(supabase, getStaleBeforeIso())

  const activeRunning = await getPrimaryRunningJob(supabase)
  if (activeRunning?.id) {
    logJson('info', 'worker_global_lock_busy', {
      runningJobId: activeRunning.id
    })
    return {
      queued: 0,
      processed: 0,
      failed: 0,
      skipped: 0,
      staleFailed
    }
  }

  let processed = 0
  let failed = 0
  let skipped = 0

  for (let index = 0; index < maxJobs; index += 1) {
    const claimedJob = await claimOldestQueuedJob(supabase)
    if (!claimedJob?.id) break

    const ownsGlobalLock = await canWorkerProcessClaimedJob(supabase, claimedJob.id)
    if (!ownsGlobalLock) {
      await releaseClaimedJob(supabase, claimedJob.id)
      skipped += 1
      logJson('info', 'worker_global_lock_release_claim', {
        jobId: claimedJob.id
      })
      continue
    }

    logJson('info', 'job_claimed', {
      jobId: claimedJob.id,
      rootUrl: claimedJob.root_url,
      mode: claimedJob.mode,
      pagesLimit: claimedJob.pages_limit
    })

    try {
      const crawlResult = await runSiteAuditCrawler(supabase, claimedJob)
      if (crawlResult.cancelled) {
        skipped += 1
        await syncJobCounters(supabase, claimedJob.id)
        logJson('info', 'job_cancelled_during_run', {
          jobId: claimedJob.id
        })
        continue
      }

      const counters = await syncJobCounters(supabase, claimedJob.id)
      if (Number(counters.pagesScanned || 0) <= 0) {
        if (Number(counters.pagesFailed || 0) > 0) {
          throw new Error('[audit] Site audit nedokazal uspesne naskenovat ziadnu podstranku. Vsetky pokusy zlyhali.')
        }
        throw new Error('[audit] Site audit nenasiel ziadnu skenovatelnu podstranku (robots, depth alebo URL filtre).')
      }

      await finalizeSiteAuditJob(supabase, claimedJob)
      processed += 1
    } catch (error) {
      failed += 1
      const categorized = formatCategorizedError(error)
      await markJobFailed(supabase, claimedJob.id, truncateText(categorized.message, 700))
      logJson('error', 'job_failed', {
        jobId: claimedJob.id,
        errorCategory: categorized.category,
        error: categorized.message
      })
    }
  }

  return {
    queued: processed + failed + skipped,
    processed,
    failed,
    skipped,
    staleFailed
  }
}

