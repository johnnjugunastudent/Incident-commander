import { app } from './app.js';
import { closePool } from './db/index.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await closePool();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Incident Commander server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Demo mode: ${process.env.INCIDENT_DEMO_MODE === 'true' ? 'enabled' : 'disabled'}`);
});

// Export for testing
export { app, PORT };