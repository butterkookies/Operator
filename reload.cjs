const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:83WbwaYiER8kJaDV@db.pjgylgatjlivqbaeruko.supabase.co:5432/postgres'
});

client.connect()
  .then(() => client.query("NOTIFY pgrst, 'reload schema';"))
  .then(() => {
    console.log('PostgREST schema cache reloaded successfully.');
    client.end();
  })
  .catch(e => {
    console.error('Error:', e);
    client.end();
  });
