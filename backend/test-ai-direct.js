const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('DB connected');

  const User = require('./src/models/User');
  const Resume = require('./src/models/Resume');
  
  const user = await User.findOne({ role: 'USER' }).select('_id email');
  if (!user) { console.log('No user found'); process.exit(1); }
  console.log('Testing with user:', user.email);

  const resume = await Resume.findOne({ user: user._id });
  if (!resume) { console.log('No resume found'); process.exit(1); }
  console.log('Testing with resume:', resume.fileName);

  const { getCVAISuggestions } = require('./src/services/analyticsService');
  const result = await getCVAISuggestions(user._id.toString(), resume._id.toString());
  
  console.log('\n=== RESULT ===');
  console.log('model:', result.model);
  console.log('debugError:', result.debugError || 'none');
  console.log('suggestions count:', result.suggestions?.length);
  if (result.suggestions?.length) console.log('first suggestion:', result.suggestions[0]);
  
  process.exit(0);
}

test().catch(e => { console.error('TEST FAILED:', e); process.exit(1); });
