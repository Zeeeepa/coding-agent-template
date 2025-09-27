#!/usr/bin/env node

// Test with existing sandbox
const { Daytona } = require('@daytonaio/sdk')

async function testExistingSandbox() {
  console.log('🧪 Testing with existing sandbox...')
  
  if (!process.env.DAYTONA_API_KEY) {
    console.error('❌ DAYTONA_API_KEY is required')
    process.exit(1)
  }
  
  try {
    const daytona = new Daytona()
    console.log('✅ Daytona SDK initialized')
    
    // List existing sandboxes
    const sandboxes = await daytona.list()
    console.log(`📋 Found ${sandboxes.length} sandboxes`)
    
    if (sandboxes.length > 0) {
      const existingSandbox = sandboxes[0]
      console.log('📍 Testing with sandbox:', existingSandbox.id)
      
      try {
        // Try to get the sandbox
        const sandbox = await daytona.get(existingSandbox.id)
        console.log('✅ Successfully retrieved sandbox')
        console.log('📊 Sandbox details:', {
          id: sandbox.id,
          url: sandbox.url,
          hasProcess: !!sandbox.process
        })
        
        // Try to execute a command
        if (sandbox.process) {
          console.log('⚡ Testing command execution...')
          const response = await sandbox.process.executeCommand('echo "Hello from existing sandbox!"')
          console.log('✅ Command executed successfully!')
          console.log('📤 Output:', response.result)
          console.log('📊 Exit code:', response.exitCode)
        } else {
          console.log('❌ Sandbox does not have process property')
        }
        
      } catch (getError) {
        console.log('❌ Failed to get sandbox:', getError.message)
        console.log('📋 Error details:', getError.response?.data || getError.stack)
      }
    } else {
      console.log('📝 No existing sandboxes to test with')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('📋 Error details:', error.response?.data || error.stack)
  }
}

testExistingSandbox().catch(console.error)
