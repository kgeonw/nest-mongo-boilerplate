import mongoose from 'mongoose';
import AdminBroExpress from 'admin-bro-expressjs';
import AdminBroMongoose from 'admin-bro-mongoose';
import session from 'express-session';
import connectMongo from 'connect-mongo';

import config from '../config/admin';
import getAdminAuthenticationConfig from '../admin/authentication/admin-auth.config';

import { Environment } from '../config/environments';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdminBro = require('admin-bro');

const EXPIRED_SESSIONS_REMOVE_INTERVAL = 24 * 60; // in minutes
AdminBro.registerAdapter(AdminBroMongoose);

const getRouterFor = async (adminBro, connection): Promise<object> => {
  if (process.env.NODE_ENV === Environment.DEVELOPMENT) {
    return AdminBroExpress.buildRouter(adminBro);
  }
  const MongoStoreFactory = connectMongo(session);
  return AdminBroExpress.buildAuthenticatedRouter(adminBro, await getAdminAuthenticationConfig(connection), null, {
    httpOnly: false,
    resave: true,
    saveUninitialized: true,
    store: new MongoStoreFactory({
      mongooseConnection: connection,
      autoRemove: 'interval',
      autoRemoveInterval: EXPIRED_SESSIONS_REMOVE_INTERVAL,
    }),
  });
};

export default async (app): Promise<void> => {
  const expressApp = app.getHttpAdapter().getInstance();
  const connection = mongoose && mongoose.connections && mongoose.connections[1];
  if (!connection) {
    throw new Error('Mongoose connection is not configured');
  }
  const adminBro = new AdminBro(config(connection));
  const router = await getRouterFor(adminBro, connection);
  expressApp.use(adminBro.options.rootPath, router);
};