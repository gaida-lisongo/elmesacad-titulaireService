import jetPaths from 'jet-paths';

const Paths = {
  _: '/api',
  Charges: {
    _: '/charges',
    Add: '/add',
    All: '/all',
    GetById: '/:id',
    Update: '/update/:id',
    Delete: '/delete/:id',
  },
  Seances: {
    _: '/seances',
    Add: '/add',
    All: '/all',
    ByCharge: '/charge/:chargeId',
    Update: '/update/:id',
    Delete: '/delete/:id',
  },
  Presences: {
    _: '/presences',
    Check: '/check',
    BySeance: '/seance/:seanceId',
    Update: '/update/:id',
  },
  Notes: {
    _: '/notes',
    Add: '/add',
    All: '/all',
    GetByMatricule: '/student/:matricule',
    GetByCourse: '/course/:courseRef',
    ResultByMatricule: '/result/:matricule',
  },
  Resolutions: {
    _: '/resolutions',
    Submit: '/submit',
    All: '/all',
  },
  Activites: {
    _: '/activites',
    Add: '/add',
    ByCharge: '/charge/:chargeId',
    Delete: '/delete/:id',
  },
  Users: {
    _: '/users',
    Get: '/all',
    Add: '/add',
    Update: '/update',
    Delete: '/delete/:id',
  },
} as const;

export const JetPaths = jetPaths(Paths);
export default Paths;
