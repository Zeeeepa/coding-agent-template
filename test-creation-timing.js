#!/usr/bin/env node

// Test sandbox creation timing
const { Daytona } = require('@daytonaio/sdk')

async function testCreationTiming() {
  console.log('🧪 Testing sandbox creation timing...')
  
  if (!process.env.DAYTONA_API_KEY) {
    console.error('❌ DAYTONA_API_KEY is required')
    process.exit(1)
  }
  
  try {
    const daytona = new Daytona()
    console.log('✅ Daytona SDK initialized')
    
    // Count sandboxes before
    const beforeSandboxes = await daytona.list()
    console.log(`📋 Sandboxes before creation: ${beforeSandboxes.length}`)
    
    // Create sandbox
    console.log('\n🚀 Creating sandbox...')
    const createResult = await daytona.create({ language: 'typescript' })
    console.log('✅ Create call returned successfully!')
    console.log('📍 Returned sandbox ID:', createResult.id)
    console.log('📊 Returned sandbox properties:', Object.keys(createResult))
    
    // Count sandboxes after
    const afterSandboxes = await daytona.list()
    console.log(`📋 Sandboxes after creation: ${afterSandboxes.length}`)
    
    // Check if our sandbox is in the list
    const ourSandbox = afterSandboxes.find(s => s.id === createResult.id)
    console.log('🔍 Our sandbox in list:', ourSandbox ? 'Yes' : 'No')
    
    if (ourSandbox) {
      console.log('📊 Sandbox from list:', {
        id: ourSandbox.id,
        status: ourSandbox.status || 'unknown'
      })
    }
    
    // Try to get the sandbox with retries
    console.log('\n⏳ Attempting to retrieve sandbox with retries...')
    let sandbox = null
    for (let i = 0; i < 10; i++) {
      try {
        sandbox = await daytona.get(createResult.id)
        console.log(`✅ Successfully retrieved sandbox on attempt ${i + 1}`)
        break
      } catch (error) {
        console.log(`❌ Attempt ${i + 1} failed: ${error.message}`)
        if (i < 9) {
          console.log('⏳ Waiting 2 seconds before retry...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }
    
    if (sandbox) {
      console.log('📊 Retrieved sandbox details:', {
        id: sandbox.id,
        url: sandbox.url,
        hasProcess: !!sandbox.process
      })
      
      // Test command execution
      if (sandbox.process) {
        console.log('\n⚡ Testing command execution...')
        const response = await sandbox.process.executeCommand('echo "Success!"')
        console.log('✅ Command executed successfully!')
        console.log('📤 Output:', response.result)
      }
      
      // Clean up
      console.log('\n🧹 Cleaning up...')
      await daytona.remove(sandbox)
      console.log('✅ Sandbox removed')
    } else {
      console.log('❌ Could not retrieve sandbox after 10 attempts')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('📋 Error details:', error.response?.data || error.stack)
  }
}

testCreationTiming().catch(console.error)
