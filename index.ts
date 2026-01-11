import { app } from '@/app.js';
import { config } from '@/config/index.js';

// Re-export for tests
export { app };

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
  console.log(`📝 Environment: ${config.nodeEnv}`);
  console.log(`🔒 CORS enabled for: ${config.cors.allowedOrigins.join(', ')}`);
});
