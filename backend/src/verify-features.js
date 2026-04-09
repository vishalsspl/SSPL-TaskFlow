import { getActiveFeatures } from './controllers/authController.js';

async function test() {
  console.log('Testing getActiveFeatures for SUPERADMIN (no org)...');
  const features = await getActiveFeatures(null);
  console.log(JSON.stringify(features, null, 2));
  
  if (features.chat === true) {
    console.log('✅ PASS: Chat feature enabled for SuperAdmin');
  } else {
    console.log('❌ FAIL: Chat feature missing for SuperAdmin');
  }
}

test();
