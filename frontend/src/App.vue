<template>
  <div class="min-h-screen bg-base-200">
    <!-- Login Screen -->
    <div v-if="!isAuthenticated && !loading" class="min-h-screen flex items-center justify-center p-6">
      <div class="card w-full max-w-md bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="text-center mb-6">
            <img :src="logo" alt="logo" />
            <h1 class="text-3xl font-bold">Database Backup Manager</h1>
            <p class="text-base-content/60 mt-2">Secure automated backups to Google Drive</p>
          </div>
          <button @click="handleGoogleLogin" class="btn btn-primary btn-block">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="min-h-screen flex items-center justify-center">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Main Dashboard -->
    <div v-if="isAuthenticated && !loading" class="container mx-auto p-6">
      <!-- Header -->
      <header class="mb-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            <h1 class="text-3xl font-bold">Database Backup Manager</h1>
          </div>
          <div class="badge badge-primary gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Scheduled: Daily at 01:00
          </div>
        </div>
      </header>

      <!-- Stats -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-primary">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <div class="stat-title">Configurations</div>
            <div class="stat-value text-primary">{{ configs.length }}</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-success">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="stat-title">Last Backup</div>
            <div class="stat-value text-success">
              {{ backupHistory.length > 0 ? new Date(backupHistory[0].timestamp).toLocaleDateString() : 'N/A' }}
            </div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-secondary">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <div class="stat-title">Total Backups</div>
            <div class="stat-value text-secondary">{{ backupHistory.length }}</div>
          </div>
        </div>
      </div>

      <!-- Configurations -->
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h2 class="card-title">Backup Configurations</h2>
            <button @click="showNewConfig = true" class="btn btn-primary">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              New Config
            </button>
          </div>

          <!-- New Config Form -->
          <div v-if="showNewConfig" class="card bg-base-200 mb-4">
            <div class="card-body">
              <h3 class="card-title text-lg mb-3">New Backup Configuration</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input v-model="newConfig.appName" type="text" placeholder="App Name" class="input input-bordered" />
                <select v-model="newConfig.dbType" @change="updatePort" class="select select-bordered">
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                </select>
                <input v-model="newConfig.dbHost" type="text" placeholder="Database Host" class="input input-bordered" />
                <input v-model="newConfig.dbPort" type="text" placeholder="Port" class="input input-bordered" />
                <input v-model="newConfig.dbName" type="text" placeholder="Database Name" class="input input-bordered" />
                <input v-model="newConfig.dbUser" type="text" placeholder="Database User" class="input input-bordered" />
                <input v-model="newConfig.dbPassword" type="password" placeholder="Database Password" class="input input-bordered" />
                <input v-model="newConfig.googleDriveFolderId" type="text" placeholder="Google Drive Folder ID" class="input input-bordered" />
              </div>
              <div class="card-actions justify-end mt-4">
                <button @click="showNewConfig = false" class="btn btn-ghost">Cancel</button>
                <button @click="createConfig" class="btn btn-success">Create</button>
              </div>
            </div>
          </div>

          <!-- Config List -->
          <div class="space-y-3">
            <div v-for="config in configs" :key="config.appName" class="card bg-base-200">
              <div class="card-body flex-row items-center justify-between p-4">
                <div class="flex-1">
                  <h3 class="font-semibold text-lg">{{ config.appName }}</h3>
                  <p class="text-sm opacity-60">
                    {{ config.dbType.toUpperCase() }} • {{ config.dbName }}@{{ config.dbHost }}:{{ config.dbPort }}
                  </p>
                </div>
                <div class="flex gap-2">
                  <button @click="runBackup(config.appName)" class="btn btn-primary btn-sm" title="Run Backup Now">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button @click="deleteConfig(config.appName)" class="btn btn-error btn-sm" title="Delete Config">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div v-if="configs.length === 0" class="text-center py-8 opacity-60">
              No configurations yet. Create one to get started!
            </div>
          </div>
        </div>
      </div>

      <!-- Backup History -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Recent Backups</h2>
          <div class="space-y-2">
            <div v-for="(backup, idx) in backupHistory.slice(0, 10)" :key="idx" class="card bg-base-200">
              <div class="card-body flex-row items-center justify-between p-3">
                <div class="flex items-center gap-3">
                  <div v-if="backup.success" class="badge badge-success gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Success
                  </div>
                  <div v-else class="badge badge-error gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Failed
                  </div>
                  <div>
                    <p class="font-medium">{{ backup.appName }}</p>
                    <p class="text-sm opacity-60">
                      {{ new Date(backup.timestamp).toLocaleString() }} • {{ backup.size }}
                    </p>
                  </div>
                </div>
                <div v-if="backup.driveFileId" class="tooltip" data-tip="Uploaded to Google Drive">
                  <svg class="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
              </div>
            </div>
            <div v-if="backupHistory.length === 0" class="text-center py-8 opacity-60">
              No backup history yet
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import logo from './assets/logo.png'

const API_BASE = '/api'

const configs = ref([])
const backupHistory = ref([])
const isAuthenticated = ref(false)
const loading = ref(true)
const showNewConfig = ref(false)
const newConfig = ref({
  appName: '',
  dbType: 'postgresql',
  dbHost: 'localhost',
  dbPort: '5432',
  dbName: '',
  dbUser: '',
  dbPassword: '',
  backupKeepDays: '7',
  backupKeepDriveDays: '30',
  googleDriveFolderId: ''
})

onMounted(() => {
  checkAuth()
  loadConfigs()
  loadBackupHistory()
})

const checkAuth = async () => {
  try {
    const res = await fetch(`${API_BASE}/auth/status`, { credentials: 'include' })
    const data = await res.json()
    isAuthenticated.value = data.authenticated
  } catch (err) {
    console.error('Auth check failed:', err)
  } finally {
    loading.value = false
  }
}

const handleGoogleLogin = () => {
  window.location.href = `${API_BASE}/auth/google`
}

const loadConfigs = async () => {
  try {
    const res = await fetch(`${API_BASE}/configs`, { credentials: 'include' })
    const data = await res.json()
    configs.value = data.configs || []
  } catch (err) {
    console.error('Failed to load configs:', err)
  }
}

const loadBackupHistory = async () => {
  try {
    const res = await fetch(`${API_BASE}/backups/history`, { credentials: 'include' })
    const data = await res.json()
    backupHistory.value = data.history || []
  } catch (err) {
    console.error('Failed to load history:', err)
  }
}

const updatePort = () => {
  newConfig.value.dbPort = newConfig.value.dbType === 'postgresql' ? '5432' : '3306'
}

const createConfig = async () => {
  try {
    await fetch(`${API_BASE}/configs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newConfig.value)
    })
    showNewConfig.value = false
    newConfig.value = {
      appName: '',
      dbType: 'postgresql',
      dbHost: 'localhost',
      dbPort: '5432',
      dbName: '',
      dbUser: '',
      dbPassword: '',
      backupKeepDays: '7',
      backupKeepDriveDays: '30',
      googleDriveFolderId: ''
    }
    loadConfigs()
  } catch (err) {
    console.error('Failed to create config:', err)
  }
}

const deleteConfig = async (appName) => {
  if (!confirm(`Delete backup config for ${appName}?`)) return
  try {
    await fetch(`${API_BASE}/configs/${appName}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    loadConfigs()
  } catch (err) {
    console.error('Failed to delete config:', err)
  }
}

const runBackup = async (appName) => {
  try {
    await fetch(`${API_BASE}/backups/run/${appName}`, {
      method: 'POST',
      credentials: 'include'
    })
    alert(`Backup started for ${appName}`)
    setTimeout(loadBackupHistory, 2000)
  } catch (err) {
    console.error('Failed to run backup:', err)
  }
}
</script>
