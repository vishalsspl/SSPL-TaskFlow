import fetch from 'node-fetch';

async function main() {
  try {
    const res = await fetch('http://localhost:5000/api/projects', {
      headers: {
        // Need a valid token. Let's see if we can get one from the db or just print the db.
      }
    });
  } catch (e) {
    console.error(e);
  }
}
main();
