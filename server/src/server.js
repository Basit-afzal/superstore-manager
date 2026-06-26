import app from './app.js';
import dbConnection from '../dbConnection.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await dbConnection();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server due to DB connection error');
    process.exit(1);
  }
};


startServer();
