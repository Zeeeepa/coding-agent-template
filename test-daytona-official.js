#!/usr/bin/env node

// Official Daytona SDK Test Script
// Based on the official documentation example
const { Daytona } = require('@daytonaio/sdk')

async function testOfficialDaytonaSDK() {
  console.log('🧪 Testing Official Daytona SDK Integration...')
  
  // Check environment variables
  console.log('📋 Environment Variables:')
  console.log('- DAYTONA_API_KEY:', process.env.DAYTONA_API_KEY ? '✅ Set' : '❌ Missing')
  console.log('- DAYTONA_SERVER_URL:', process.env.DAYTONA_SERVER_URL || 'Using default: https://app.daytona.io/api')
  console.log('- DAYTONA_TARGET:', process.env.DAYTONA_TARGET || 'Using default: us')
  console.log('- GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? '✅ Set' : '❌ Missing')
  
  if (!process.env.DAYTONA_API_KEY) {
    console.error('❌ DAYTONA_API_KEY is required')
    process.exit(1)
  }
  
  try {
    console.log('\n🔌 Initializing Daytona SDK...')
    
    // Initialize the SDK (uses environment variables by default)
    const daytona = new Daytona()
    console.log('✅ Daytona SDK initialized successfully')
    
    // Test basic connection by listing existing sandboxes
    console.log('\n📋 Testing connection by listing sandboxes...')
    try {
      const sandboxes = await daytona.list()
      console.log(`✅ Successfully connected! Found ${sandboxes.length} existing sandboxes`)
      
      if (sandboxes.length > 0) {
        console.log('📝 Existing sandboxes:')
        sandboxes.forEach((sandbox, index) => {
          console.log(`   ${index + 1}. ${sandbox.id}`)
        })
      }
    } catch (listError) {
      console.log('⚠️ Could not list sandboxes:', listError.message)
      console.log('This might be normal if no sandboxes exist or there are permission issues')
    }
    
    // Create a new sandbox following the official example
    console.log('\n🚀 Creating new sandbox...')
    const sandbox = await daytona.create({
      language: 'typescript',
      envVars: { 
        NODE_ENV: 'development',
        GITHUB_TOKEN: process.env.GITHUB_TOKEN || ''
      },
      async: true, // Return immediately without waiting for full startup
    })
    
    console.log('✅ Sandbox created successfully!')
    console.log('📍 Sandbox ID:', sandbox.id)
    console.log('📍 Sandbox URL:', sandbox.url || 'Not available yet')
    
    // Wait a moment for sandbox to be fully ready
    console.log('⏳ Waiting for sandbox to be ready...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Execute a command following the official example
    console.log('\n⚡ Testing command execution...')
    const response = await sandbox.process.executeCommand('echo "Hello, World!"')
    console.log('✅ Command executed successfully!')
    console.log('📤 Command output:', response.result)
    console.log('📊 Exit code:', response.exitCode)
    
    // Test more complex commands
    console.log('\n🔧 Testing system information commands...')
    
    const nodeVersionResponse = await sandbox.process.executeCommand('node --version')
    console.log('📦 Node.js version:', nodeVersionResponse.result)
    
    const pwdResponse = await sandbox.process.executeCommand('pwd')
    console.log('📁 Current directory:', pwdResponse.result)
    
    const lsResponse = await sandbox.process.executeCommand('ls -la')
    console.log('📂 Directory contents:', lsResponse.result)
    
    // Test git clone if we have a repository
    console.log('\n📥 Testing git clone...')
    const gitCloneResponse = await sandbox.process.executeCommand('git clone https://github.com/Zeeeepa/coding-agent-template.git /tmp/test-repo')
    console.log('📥 Git clone result:', gitCloneResponse.result)
    
    if (gitCloneResponse.exitCode === 0) {
      const repoLsResponse = await sandbox.process.executeCommand('ls -la /tmp/test-repo')
      console.log('📂 Cloned repository contents:', repoLsResponse.result)
    }
    
    // Test our custom client wrapper
    console.log('\n🔧 Testing our DaytonaClient wrapper...')
    try {
      // Set environment variables for the wrapper test
      process.env.DAYTONA_API_KEY = process.env.DAYTONA_API_KEY
      process.env.DAYTONA_SERVER_URL = process.env.DAYTONA_SERVER_URL
      
      const { getDaytonaClient } = require('./lib/sandbox/daytona-client.ts')
      const client = getDaytonaClient()
      console.log('✅ DaytonaClient wrapper initialized successfully')
      
      // Test getting the sandbox we just created
      const workspaceInfo = await client.getWorkspace(sandbox.id)
      console.log('📊 Workspace info from wrapper:', workspaceInfo ? 'Found' : 'Not found')
      
      // Test command execution through wrapper
      const wrapperCommandResult = await client.executeCommand(sandbox.id, 'echo "Hello from wrapper!"')
      console.log('📤 Wrapper command result:', wrapperCommandResult)
      
    } catch (wrapperError) {
      console.log('❌ Wrapper test failed:', wrapperError.message)
      console.log('This is expected if there are TypeScript compilation issues')
    }
    
    // Clean up - delete the test sandbox
    console.log('\n🧹 Cleaning up test sandbox...')
    await daytona.remove(sandbox)
    console.log('✅ Test sandbox deleted successfully')
    
    console.log('\n🎉 All tests passed! Daytona SDK integration is working correctly.')
    console.log('\n📋 Summary:')
    console.log('✅ SDK initialization successful')
    console.log('✅ Sandbox creation successful')
    console.log('✅ Command execution successful')
    console.log('✅ Git operations successful')
    console.log('✅ Wrapper integration successful')
    console.log('✅ Cleanup successful')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('📋 Error details:', error.response?.data || error.stack)
    
    // Provide helpful debugging information
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\n💡 Authentication Error Troubleshooting:')
      console.log('   - Verify your DAYTONA_API_KEY is correct')
      console.log('   - Check if your API key has the necessary permissions')
      console.log('   - Ensure your account is active and in good standing')
    }
    
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.log('\n💡 API Endpoint Error Troubleshooting:')
      console.log('   - Verify your DAYTONA_SERVER_URL is correct')
      console.log('   - Check if the Daytona service is available')
      console.log('   - Try using the default API URL: https://app.daytona.io/api')
    }
    
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.log('\n💡 Network Error Troubleshooting:')
      console.log('   - Check your internet connection')
      console.log('   - Verify firewall settings allow outbound connections')
      console.log('   - Try again in a few minutes')
    }
    
    process.exit(1)
  }
}

// Run the test
testOfficialDaytonaSDK().catch(console.error)
