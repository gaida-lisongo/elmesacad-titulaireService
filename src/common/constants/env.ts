import jetEnv, { num } from 'jet-env';
import tspo from 'tspo';

/******************************************************************************
                                 Constants
******************************************************************************/

// NOTE: These need to match the names of your ".env" files
export const NodeEnvs = {
  DEV: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

/******************************************************************************
                                 Setup
******************************************************************************/

const EnvVars = jetEnv({
  NodeEnv: (v) => tspo.isValue(NodeEnvs, v),
  Port: (v) => (v === undefined ? 3000 : num(v)),
  MongoUri: String,
  InbtpLat: (v) => (v === undefined ? -4.331105 : num(v)),
  InbtpLong: (v) => (v === undefined ? 15.251937 : num(v)),
  LocationTolerance: (v) => (v === undefined ? 30 : num(v)),
});

/******************************************************************************
                            Export default
******************************************************************************/

export default EnvVars;
