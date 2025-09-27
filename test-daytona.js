#!/usr/bin/env node

// Test script to validate Daytona SDK structure and API
const { Daytona, Workspace, Process } = require('@daytonaio/sdk');

async function testDaytonaSDK() {
  console.log('🧪 Testing Daytona SDK Structure...');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('- DAYTONA_API_KEY:', process.env.DAYTONA_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('- GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? '✅ Set' : '❌ Missing');
  console.log('- ANTHROPIC_BASE_URL:', process.env.ANTHROPIC_BASE_URL || 'Not set');
  console.log('- ANTHROPIC_AUTH_TOKEN:', process.env.ANTHROPIC_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
  
  try {
    console.log('\n🔍 Exploring Daytona SDK...');
    
    // Test Daytona class instantiation
    console.log('Creating Daytona instance...');
    
    // The SDK requires both API key and server URL
    const config = {
      apiKey: process.env.DAYTONA_API_KEY,
      serverUrl: process.env.DAYTONA_SERVER_URL || 'https://api.daytona.io' // Default or provided URL
    };
    
    console.log('Using config:', { 
      apiKey: config.apiKey ? '✅ Set' : '❌ Missing',
      serverUrl: config.serverUrl 
    });
    
    const daytona = new Daytona(config);
    console.log('✅ Daytona instance created');
    
    // Check available methods
    console.log('\n📋 Available Daytona methods:');
    console.log(Object.getOwnPropertyNames(Daytona.prototype));
    
    console.log('\n📋 Available Workspace methods:');
    console.log(Object.getOwnPropertyNames(Workspace.prototype));
    
    console.log('\n📋 Available Process methods:');
    console.log(Object.getOwnPropertyNames(Process.prototype));
    
    // Try to list workspaces to test connection
    console.log('\n🔌 Testing connection by listing workspaces...');
    try {
      const workspaces = await daytona.list();
      console.log('✅ Successfully connected to Daytona');
      console.log('📊 Found', workspaces.length, 'workspaces');
      
      if (workspaces.length > 0) {
        console.log('📝 First workspace:', workspaces[0]);
      }
    } catch (listError) {
      console.log('⚠️ Could not list workspaces:', listError.message);
      console.log('This might be normal if no workspaces exist or authentication is needed');
    }
    
    // Try to create a simple workspace
    console.log('\n🚀 Testing workspace creation...');
    try {
      const workspace = await daytona.create({
        id: `test-workspace-${Date.now()}`,
        language: 'javascript',
        repository: {
          url: 'https://github.com/Zeeeepa/coding-agent-template.git',
          branch: 'main'
        }
      });
      
      console.log('✅ Workspace created successfully!');
      console.log('📍 Workspace ID:', workspace.id);
      
      // Try to get workspace info
      const info = await workspace.info();
      console.log('📊 Workspace info:', info);
      
      // Test command execution
      console.log('\n⚡ Testing command execution...');
      const { Process } = require('@daytonaio/sdk');
      const process = new Process(workspace);
      const result = await process.executeCommand('echo "Hello from Daytona!"');
      console.log('✅ Command result:', result);
      
      // Clean up
      console.log('\n🧹 Cleaning up test workspace...');
      await workspace.delete();
      console.log('✅ Test workspace deleted');
      
    } catch (createError) {
      console.log('❌ Workspace creation failed:', createError.message);
      console.log('📋 Error details:', createError.response?.data || 'No additional details');
      
      if (createError.message.includes('404')) {
        console.log('\n💡 This suggests the DAYTONA_SERVER_URL might be incorrect.');
        console.log('   Please verify your Daytona server URL with your Daytona provider.');
        console.log('   Common formats:');
        console.log('   - https://your-daytona-instance.com');
        console.log('   - https://api.daytona.your-domain.com');
      }
    }
    
    console.log('\n🎉 SDK exploration completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testDaytonaSDK().catch(console.error);
