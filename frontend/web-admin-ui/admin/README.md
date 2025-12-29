# Admin Module (UI)

This folder contains a minimal scaffold for the Admin UI used within `web-admin-ui`.

Files:
- `AdminDashboard.jsx` - main dashboard component that composes the admin sections.
- `UserManagement.jsx` - placeholder UI for managing users (approve/block, roles).
- `PropertyApproval.jsx` - placeholder UI for listing properties pending approval.
- `index.js` - default export for easy imports.

Integration notes:
- The app already includes `src/AuthScreen/Web-Auth.jsx` which you said will be used by admin to log in. After successful admin login, render or navigate to the admin dashboard component:

```js
import AdminDashboard from '../admin';
// route or conditional render for admin users
```

- Connect these components to backend endpoints to fetch users and pending properties. Keep CORS and auth tokens in mind.

Next steps I can do for you:
- Wire a route into your existing client router (React Router / Vite) to expose `/admin`.
- Hook the components to real backend endpoints (list pending properties, approve/reject actions).
- Add tests and more detailed UI per your design.
