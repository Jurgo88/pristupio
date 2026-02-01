<script setup lang="ts">
import { onMounted } from 'vue'
import { useProjectStore } from '@/stores/project.store'

const projectStore = useProjectStore()

onMounted(() => {
  projectStore.loadMockProjects()
})
</script>

<template>
  <div>
    <h1>Dashboard</h1>

    <div class="row">
      <div
        v-for="project in projectStore.projects"
        :key="project.id"
        class="col-md-4 mb-3"
      >
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">{{ project.name }}</h5>
            <p class="card-text">{{ project.url }}</p>

            <router-link
              class="btn btn-sm btn-primary"
              :to="`/project/${project.id}`"
            >
              View audit
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
