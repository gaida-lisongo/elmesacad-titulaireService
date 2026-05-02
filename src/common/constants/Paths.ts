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
    Bulk: '/bulk',
    All: '/all',
    GetByMatricule: '/student/:matricule',
    GetByCourse: '/course/:courseRef',
    ResultByMatricule: '/result/:matricule',
    GetById: '/:id',
    Update: '/update/:id',
    Delete: '/delete/:id',
  },
  Resolutions: {
    _: '/resolutions',
    Submit: '/submit',
    All: '/all',
    ByActiviteAndEmail: '/by-activite/:activiteId',
    UpdateNote: '/update-note/:id',
  },
  Activites: {
    _: '/activites',
    Add: '/add',
    All: '/all',
    GetById: '/:id',
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
