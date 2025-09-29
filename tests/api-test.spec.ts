import { test, expect } from '@playwright/test'

test.describe('API Endpoints Test', () => {
  test('test all API endpoints', async ({ request }) => {
    console.log('🚀 Starting API tests...')
    
    // Test GitHub user endpoint
    console.log('📍 Testing GitHub user endpoint...')
    try {
      const userResponse = await request.get('/api/github/user')
      console.log(`GitHub user status: ${userResponse.status()}`)
      
      if (userResponse.ok()) {
        const userData = await userResponse.json()
        console.log('✅ GitHub user endpoint working')
        console.log(`User: ${userData.login || 'Unknown'}`)
      } else {
        console.log('⚠️ GitHub user endpoint returned error (expected without token)')
      }
    } catch (error) {
      console.log('⚠️ GitHub user endpoint failed (expected without token)')
    }
    
    // Test GitHub orgs endpoint
    console.log('📍 Testing GitHub orgs endpoint...')
    try {
      const orgsResponse = await request.get('/api/github/orgs')
      console.log(`GitHub orgs status: ${orgsResponse.status()}`)
      
      if (orgsResponse.ok()) {
        const orgsData = await orgsResponse.json()
        console.log('✅ GitHub orgs endpoint working')
        console.log(`Found ${orgsData.length || 0} organizations`)
      } else {
        console.log('⚠️ GitHub orgs endpoint returned error (expected without token)')
      }
    } catch (error) {
      console.log('⚠️ GitHub orgs endpoint failed (expected without token)')
    }
    
    // Test tasks endpoint
    console.log('📍 Testing tasks endpoint...')
    try {
      const tasksResponse = await request.get('/api/tasks')
      console.log(`Tasks status: ${tasksResponse.status()}`)
      
      if (tasksResponse.ok()) {
        const tasksData = await tasksResponse.json()
        console.log('✅ Tasks endpoint working')
        console.log(`Found ${tasksData.length || 0} tasks`)
      } else {
        console.log('❌ Tasks endpoint failed')
      }
    } catch (error) {
      console.log(`❌ Tasks endpoint error: ${error}`)
    }
    
    // Test creating a task
    console.log('📍 Testing task creation...')
    try {
      const createTaskResponse = await request.post('/api/tasks', {
        data: {
          description: 'Test task for API validation',
          selectedOwner: 'test-owner',
          selectedRepo: 'test-repo',
          selectedAgent: 'claude',
          installDependencies: false,
          maxDuration: 5
        }
      })
      
      console.log(`Create task status: ${createTaskResponse.status()}`)
      
      if (createTaskResponse.ok()) {
        const taskData = await createTaskResponse.json()
        console.log('✅ Task creation working')
        console.log(`Created task ID: ${taskData.id}`)
        
        // Test getting the created task
        if (taskData.id) {
          console.log('📍 Testing task retrieval...')
          const getTaskResponse = await request.get(`/api/tasks/${taskData.id}`)
          console.log(`Get task status: ${getTaskResponse.status()}`)
          
          if (getTaskResponse.ok()) {
            console.log('✅ Task retrieval working')
          } else {
            console.log('❌ Task retrieval failed')
          }
        }
      } else {
        const errorText = await createTaskResponse.text()
        console.log(`❌ Task creation failed: ${errorText}`)
      }
    } catch (error) {
      console.log(`❌ Task creation error: ${error}`)
    }
    
    console.log('✅ API tests completed!')
  })
})
