const { Daytona } = require('@daytonaio/sdk');

async function testDaytonaWithSnapshot() {
  console.log('🔧 Testing Daytona SDK with your snapshot configuration...');
  
  const config = {
    apiKey: 'dtn_c68c510cc530924d82188aa3d3ddeef5d4a2fdd05eab23363adef4992a5a5a88',
    serverUrl: 'https://app.daytona.io/api',
    target: 'us'
  };
  
  console.log('📋 Configuration:');
  console.log('- API Key:', config.apiKey.substring(0, 20) + '...');
  console.log('- Server URL:', config.serverUrl);
  console.log('- Target:', config.target);
  console.log('- Organization ID:', '6e959a8e-4028-425f-be26-84d5f6800d43');
  console.log('- Snapshot Name:', 'ubuntu-4vcpu-8ram-10gb');
  
  try {
    const daytona = new Daytona(config);
    console.log('✅ Daytona client initialized successfully');
    
    // Test 1: Try to list existing workspaces
    console.log('\n📋 Test 1: Listing existing workspaces...');
    try {
      const workspaces = await daytona.list();
      console.log(`✅ Found ${workspaces.length} existing workspaces`);
      workspaces.forEach((ws, i) => {
        console.log(`  ${i + 1}. ${ws.id} - ${ws.state}`);
      });
    } catch (error) {
      console.log('❌ Failed to list workspaces:', error.message);
    }
    
    // Test 2: Try creating with basic parameters
    console.log('\n🚀 Test 2: Creating workspace with basic parameters...');
    try {
      const basicWorkspace = await daytona.create({
        language: 'javascript',
        resources: {
          cpu: 4,
          memory: 8,    // 8GB (not MB!)
          disk: 10      // 10GB (not MB!)
        },
        envVars: {
          'TEST_VAR': 'hello-world'
        },
        async: true,
        timeout: 300
      });
      console.log('✅ Basic workspace created:', basicWorkspace.id);
      
      // Clean up
      setTimeout(async () => {
        try {
          await basicWorkspace.delete();
          console.log('🧹 Cleaned up basic workspace');
        } catch (e) {
          console.log('⚠️ Failed to clean up basic workspace:', e.message);
        }
      }, 5000);
      
    } catch (error) {
      console.log('❌ Failed to create basic workspace:', error.message);
      console.log('Error details:', error);
    }
    
    // Test 3: Try creating with image parameter (might be how snapshots work)
    console.log('\n🖼️ Test 3: Creating workspace with image parameter...');
    try {
      const imageWorkspace = await daytona.create({
        image: 'ubuntu-4vcpu-8ram-10gb', // Try using snapshot name as image
        language: 'javascript',
        resources: {
          cpu: 4,
          memory: 8,
          disk: 10
        },
        async: true,
        timeout: 300
      });
      console.log('✅ Image-based workspace created:', imageWorkspace.id);
      
      // Clean up
      setTimeout(async () => {
        try {
          await imageWorkspace.delete();
          console.log('🧹 Cleaned up image workspace');
        } catch (e) {
          console.log('⚠️ Failed to clean up image workspace:', e.message);
        }
      }, 5000);
      
    } catch (error) {
      console.log('❌ Failed to create image workspace:', error.message);
      console.log('Error details:', error);
    }
    
    // Test 4: Try with different target (organization)
    console.log('\n🎯 Test 4: Creating workspace with organization target...');
    try {
      const orgWorkspace = await daytona.create({
        language: 'javascript',
        target: '6e959a8e-4028-425f-be26-84d5f6800d43', // Your organization ID
        resources: {
          cpu: 4,
          memory: 8,
          disk: 10
        },
        async: true,
        timeout: 300
      });
      console.log('✅ Organization workspace created:', orgWorkspace.id);
      
      // Clean up
      setTimeout(async () => {
        try {
          await orgWorkspace.delete();
          console.log('🧹 Cleaned up organization workspace');
        } catch (e) {
          console.log('⚠️ Failed to clean up organization workspace:', e.message);
        }
      }, 5000);
      
    } catch (error) {
      console.log('❌ Failed to create organization workspace:', error.message);
      console.log('Error details:', error);
    }
    
  } catch (error) {
    console.log('❌ Failed to initialize Daytona client:', error.message);
    console.log('Error details:', error);
  }
}

testDaytonaWithSnapshot().catch(console.error);
