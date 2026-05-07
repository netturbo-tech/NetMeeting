const { run } = require('./harness');

require('./meeting-time.test');
require('./graph-transcripts.test');
require('./summarizer-participants.test');

run();
