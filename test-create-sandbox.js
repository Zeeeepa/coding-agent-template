#!/usr/bin/env node

// Test sandbox creation with different parameters
const { Daytona } = require('@daytonaio/sdk')

async function testCreateSandbox() {
  console.log('🧪 Testing sandbox creation...')
  
  if (!process.env.DAYTONA_API_KEY) {
    console.error('❌ DAYTONA_API_KEY is required')
    process.exit(1)
  }
  
  try {
    const daytona = new Daytona()
    console.log('✅ Daytona SDK initialized')
    
    // Try different creation parameters
    const testConfigs = [
      { name: 'minimal', config: {} },
      { name: 'with language', config: { language: 'typescript' } },
      { name: 'with envVars', config: { envVars: { NODE_ENV: 'development' } } },
      { name: 'simple string', config: 'typescript' },
    ]
    
    for (const test of testConfigs) {
      console.log(`\n🚀 Testing creation with ${test.name}:`, test.config)
      
      try {
        const sandbox = await daytona.create(test.config)
        console.log('✅ Sandbox created successfully!')
        console.log('📍 Sandbox ID:', sandbox.id)
        
        // Test command execution
        const response = await sandbox.process.executeCommand('echo "Hello!"')
        console.log('✅ Command executed:', response.result)
        
        // Clean up
        await daytona.remove(sandbox)
        console.log('✅ Sandbox cleaned up')
        
        // Success - we found a working configuration
        break
        
      } catch (createError) {
        console.log('❌ Creation failed:', createError.message)
        if (createError.response?.data) {
          console.log('📋 Error details:', createError.response.data)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('📋 Error details:', error.response?.data || error.stack)
  }
}

testCreateSandbox().catch(console.error)
