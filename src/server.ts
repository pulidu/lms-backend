import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/socket.js';
import { seedDefaultAdmin } from './controllers/authController.js';
import { seedSampleData } from './seeders/sampleSeeder.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5003;

const startServer = async () => {
  // 1. Connect database
  await connectDB();

  // 2. Run initial seeds (Default Admin account creation if missing)
  await seedDefaultAdmin();
  
  // 3. Seed professional university sample records if database is fresh
  await seedSampleData();

  // 3. Create server and socket
  const server = http.createServer(app);
  initSocket(server);

  // 4. Start listening
  server.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Server boot failed:', error);
});
