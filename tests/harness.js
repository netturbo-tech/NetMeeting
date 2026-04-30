const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  let failed = 0;

  for (const item of tests) {
    try {
      await item.fn();
      console.log(`ok - ${item.name}`);
    } catch (error) {
      failed++;
      console.error(`not ok - ${item.name}`);
      console.error(error);
    }
  }

  console.log(`\n${tests.length - failed}/${tests.length} tests passed`);

  if (failed > 0) {
    process.exit(1);
  }
}

module.exports = { test, run };
