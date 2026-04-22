# Codebase Analysis: Authentication & Role Management System

## 1. Current Authentication Flow

### Login/Register Process
- **LoginPage** ([src/pages/LoginPage.tsx](src/pages/LoginPage.tsx)): Basic email/password form
  - Accepts demo emails: `employee@drb.com`, `hod@drb.com`, `hr@drb.com`, `finance@drb.com`
  - Any password accepted in demo mode
  - Uses Supabase Authentication for secure login
  - Redirects to `/home` on successful login

- **RegisterPage** ([src/pages/RegisterPage.tsx](src/pages/RegisterPage.tsx)): User registration
  - Fields: name, email, department, position, password, confirmPassword
  - **Note**: NO ROLE field in registration form - users are always created with default `"employee"` role
  - Can be promoted to other roles via SuperAdminDashboard

- **Session Persistence**: Uses `localStorage` with key `"hr_user"`
  - Stored as JSON serialized User object
  - Persists across page refreshes
- **Session Persistence**: Uses Supabase Auth sessions
  - Securely managed by Supabase client
  - Persists across page refreshes securely

---

## 2. Role Management System

### Role Types Defined
Located in [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx):
```typescript
type UserRole = "employee" | "hod" | "hos" | "hr_admin" | "finance_admin" | "super_admin"
```

**Roles with descriptions:**
1. **employee** - Standard user, can submit forms
2. **hod** - Head of Department, approves submissions at HOS approval level
3. **hos** - Head of Service/Section, first-level approver
4. **hr_admin** - HR Administrator, manages leave & car rental forms
5. **finance_admin** - Finance Administrator, manages expense claims
6. **super_admin** - Super Admin, full system access and user management

### Where Roles Are Stored

#### Primary Storage (User's Own Session)
- **Location**: [AuthContext.tsx](src/contexts/AuthContext.tsx) - React state + localStorage
#### Primary Storage (Database)
- **Location**: Supabase database (`users`/`profiles` table) + Supabase Auth
- **Data Structure**:
  ```typescript
  interface User {
    id: string;
    name: string;
    email: string;
    employeeId: string;
    department: string;
    position: string;
    role: UserRole              // ← Role stored here
  }
  ```
- **Update Method**: `switchRole(role: UserRole)` in AuthContext
- **Persistence**: Updates both state AND localStorage

#### Users Directory (For Admin Management)
- **Location**: [UsersContext.tsx](src/contexts/UsersContext.tsx) - React state (in-memory)
- **Data Structure**:
  ```typescript
  interface AppUser {
    id: string;
    name: string;
    email: string;
    staffId: string;
    role: string                // ← Using string instead of UserRole enum
    department: string;
    supervisor?: string;
  }
  ```
- **Update Method**: `updateUser(id, {role: newRole})` in UsersContext
- **Persistence**: In-memory only (lost on page refresh)

### Key Observation
⚠️ **Two separate role systems exist:**
1. **AuthContext**: User's current session role
2. **UsersContext**: Admin user directory with roles

Currently **NOT synchronized** - changes to user roles in SuperAdminDashboard don't automatically update the logged-in user's role if they match.

---

## 3. User Creation Flow (RegisterPage)

### Process
1. User fills form with: name, email, department, position, password
2. Backend validation: All required fields, password match
3. New user created with **hardcoded `"employee"` role**
   ```javascript
   const newUser: User = {
     id: Math.random().toString(36).slice(2),
     name: data.name || "New User",
     email: data.email || "",
     employeeId: `EMP-${Math.floor(Math.random() * 900 + 100)}`,
     department: data.department || "General",
     position: data.position || "Employee",
     role: "employee"    // ← Always employee, hardcoded
   };
   ```
4. User stored in authContext and localStorage
5. Redirect to `/home`

### To Change Roles
- User must have access to **SuperAdminDashboard** (`/admin/users`)
- Or an existing super_admin can change their role via role-switching UI

---

## 4. Role Switching Mechanism

### Location
[AppSidebar.tsx](src/components/AppSidebar.tsx) - Lines 142-164

### Implementation
```jsx
<DropdownMenu>
  <DropdownMenuTrigger>
    {user?.name} - {userRole}
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <p>Switch Role (Demo)</p>
    {/* All roles listed */}
    {(Object.keys(roleLabels) as UserRole[]).map(role => (
      <DropdownMenuItem onClick={() => switchRole(role)}>
        {roleLabels[role]}
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

### Behavior
- **UI**: Appears in sidebar footer (main app layout only, not on login/register pages)
- **Access**: Available to ALL logged-in users (no permission check)
- **Scope**: Demo mode only - switches user's session role instantly
- **Persistence**: Updated in localStorage

### Triggered Actions
When role changes:
1. Updates AuthContext user object
2. Updates localStorage
3. Sidebar title/labels update immediately
4. Admin navigation items appear/disappear based on new role
5. Navigation links remain the same (no auto-redirect)

---

## 5. Dashboard Rendering & Role-Based Access

### Routing Setup
[App.tsx](src/App.tsx) - Routes defined with no role guards:

```typescript
<Route path="/home" element={<AppLayout><HomePage /></AppLayout>} />
<Route path="/admin/hr" element={<AppLayout><AdminDashboard /></AppLayout>} />
<Route path="/admin/finance" element={<AppLayout><FinanceDashboard /></AppLayout>} />
<Route path="/admin/approvals" element={<AppLayout><ApproverDashboard /></AppLayout>} />
<Route path="/admin/users" element={<AppLayout><SuperAdminDashboard /></AppLayout>} />
<Route path="/admin/cars" element={<AppLayout><CarManagement /></AppLayout>} />
```

⚠️ **No route guards implemented** - users can manually navigate to any admin URL

### Dashboard Implementations

#### HomePage ([src/pages/HomePage.tsx](src/pages/HomePage.tsx))
- **Shows**: Two department cards (HR and Finance)
- **Role-dependent**: NO - same for all roles
- **Navigation**: Links to `/hr` and `/finance` pages
- **Purpose**: Entry point for form submission

#### AdminDashboard (HR Admin) ([src/pages/AdminDashboard.tsx](src/pages/AdminDashboard.tsx))
- **Accessible by**: `hr_admin` role
- **Shows**: 
  - Tables of leave and car rental submissions (filters by form type)
  - Status badges and approval rate stats
  - Approval/rejection interface with remarks
- **Features**:
  - Search by employee name, form ID, or type
  - Detailed view for each submission
  - Approval workflow with remarks

#### FinanceDashboard ([src/pages/FinanceDashboard.tsx](src/pages/FinanceDashboard.tsx))
- **Accessible by**: `finance_admin` role
- **Shows**: 
  - Tables of expense claim submissions only
  - Status tracking (pending, approved, rejected)
  - Approval rate statistics
- **Features**:
  - Search functionality
  - Approval/rejection with remarks
  - Employee summary and submission details

#### ApproverDashboard (HOD/HOS) ([src/pages/ApproverDashboard.tsx](src/pages/ApproverDashboard.tsx))
- **Accessible by**: `hod` or `hos` roles
- **Filtering Logic**:
  ```javascript
  const hosValue = s.data.hosName || s.data.hos;
  const hodValue = s.data.hodName || s.data.hod;
  if (isHOS && hosValue === user?.name) return true;  // Filter by approver match
  if (isHOD && hodValue === user?.name) return true;
  ```
- **Workflow**:
  - HOS approves pending submissions → status: `approved_hos`
  - HOD reviews HOS-approved submissions → status: `approved_hod` or `approved`
  - Can also reject at any stage
- **Features**: 
  - Shows all three form types (car rental, leave, claim)
  - Priority color indicators by form type
  - Approval hierarchy support

#### CarManagement ([src/pages/CarManagement.tsx](src/pages/CarManagement.tsx))
- **Accessible by**: `hr_admin` role
- **Shows**: Fleet vehicle status and check-in/out management
- **Features**: Car inventory, availability tracking

---

## 6. SuperAdminDashboard Implementation

### Location
[src/pages/SuperAdminDashboard.tsx](src/pages/SuperAdminDashboard.tsx)

### Features
1. **User Management Table**
   - Search by name, email, staffId, or role
   - Displays: avatar, name, staff ID, email, role badge, department
   - Pagination support

2. **User Statistics**
   - Total personnel count
   - Active admins count
   - Pending approvals count
   - Department distribution

3. **User Editing ("Manage" button)**
   - Opens side sheet with:
     - **Role**: Dropdown selector with 6 role types
     - **Department**: Dropdown from DEPARTMENTS list
     - **Supervisor**: Search and select from HOD/HOS/HR/IT users
   - Save button updates user in UsersContext

4. **Role Types in SuperAdmin**
   - Uses string-based roles: `"EMPLOYEE"`, `"HR ADMIN"`, `"FINANCE ADMIN"`, `"HOD"`, `"HOS"`, `"IT TEAM"`
   - ⚠️ Different naming convention than AuthContext (`fire_admin` vs `HR ADMIN`)

5. **Initial Users**
   ```javascript
   [
     { id: "1", name: "Ahmad Razak", role: "IT TEAM", ... },
     { id: "2", name: "Sarah Abdullah", role: "HR ADMIN", ... },
     { id: "3", name: "Fatimah Hassan", role: "HOD", ... },
     { id: "4", name: "Ismail Rahman", role: "EMPLOYEE", ... },
     { id: "8", name: "Siti Aminah", role: "FINANCE ADMIN", ... },
   ]
   ```

### Data Persistence
- **UsersContext only** (in-memory state)
- **No backend integration** - resets on page refresh
- **Supervisor field**: For hierarchical approval workflows

---

## 7. Routing Architecture

### Router Setup
- **Framework**: React Router v6.x (from BrowserRouter import)
- **Nested Routes**: AppLayout wrapper for authenticated pages
- **Entry Point**: `/login` (root `/` redirects to `/login`)

### Main Routes
```
/                    → /login (redirect)
/login              → LoginPage
/register           → RegisterPage

/home               → HomePage (all users)
/hr                 → HRFormsPage (form submissions)
/finance            → FinanceFormsPage (form submissions)
/hr/car-rental      → CarRentalForm
/hr/leave           → LeaveForm
/finance/claim      → ClaimForm
/submissions        → MySubmissions

/admin/hr           → AdminDashboard (HR admin)
/admin/finance      → FinanceDashboard (Finance admin)
/admin/approvals    → ApproverDashboard (HOD/HOS)
/admin/users        → SuperAdminDashboard (Super admin)
/admin/cars         → CarManagement (HR admin)
/admin/dashboard    → /admin/hr (legacy redirect)

*                   → NotFound
```

### Navigation Context
- **AppLayout** ([src/components/AppLayout.tsx](src/components/AppLayout.tsx)): Wrapper for authenticated pages
  - Renders sidebar (AppSidebar) with navigation
  - Applies app-wide styling and layout

- **AppSidebar** ([src/components/AppSidebar.tsx](src/components/AppSidebar.tsx)): Conditional navigation
  - Employee nav: Home, My Submissions (for all)
  - Admin nav: Dynamic based on user role (HR/Finance/HOD/HOS dashboards)
  - Role switcher in footer
  - Logout button

---

## 8. Current System Issues & Gaps

### Authentication Issues
1. ❌ **No backend integration** - Mock authentication only
2. ❌ **No password security** - Any password accepted
3. ❌ **No email verification** during registration
4. ❌ **No role verification on route guards** - Anyone can access `/admin/*` routes
5. ❌ **localStorage vulnerability** - User data easily manipulated in dev tools

### Role Management Issues
1. ❌ **Dual role systems** - AuthContext vs UsersContext not synchronized
2. ❌ **No initial role assignment** - New users always "employee", requires admin action
3. ❌ **Case mismatch** - `hr_admin` vs `HR ADMIN` in different places
4. ❌ **No role audit trail** - No record of role change history
5. ❌ **Demo role switcher unrestricted** - Allows any user to switch to super_admin

### Data Persistence Issues
1. ❌ **No Firebase integration** - Despite firebase.ts import
2. ❌ **In-memory storage** - All data lost on refresh (except user session)
3. ❌ **No database schema** - Mock data hardcoded

### Accessibility Issues
1. ❌ **No permission checks** - Routes accessible if user knows URL
2. ❌ **No role inheritance** - super_admin doesn't automatically have all permissions
3. ❌ **Silent failures** - No warning if user accesses wrong role dashboard

---

## 9. Data Flow Summary

### Session Lifecycle
```
Login Page (email/password)
    ↓
AuthContext.login()
    ├→ Validates against MOCK_USERS or creates new user
    ├→ Updates state: user
    ├→ Saves to localStorage: "hr_user"
    └→ Navigate to /home

User browsing with role: "employee"
    ↓
Sidebar shows: Home, My Submissions
    ↓
User switches role → Role: "hr_admin"
    ├→ AuthContext.switchRole("hr_admin")
    ├→ Updates state: user.role
    ├→ Updates localStorage
    └→ Sidebar shows: Dashboard, Fleet Status

SuperAdmin updates user role
    ↓
UsersContext.updateUser(id, {role: "HR ADMIN"})
    └→ Updates in-memory users array only
```

### Submission Workflow
```
SubmissionsContext (in-memory)
    ├→ Initial submissions: car_rental, leave, claim
    ├→ Statuses: pending → approved_hos → approved_hod → approved
    └→ Filtered by:
        • Form type (AdminDashboard: leave+car; FinanceDashboard: claim only)
        • Approver name (ApproverDashboard: HOS/HOD match)
        • User role (implicit, no explicit checks)
```

---

## 10. Key Files Reference

| File | Purpose | Key Exports |
|------|---------|------------|
| [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) | User authentication & session | `useAuth()`, `AuthProvider`, `User`, `UserRole` |
| [src/contexts/UsersContext.tsx](src/contexts/UsersContext.tsx) | User directory for admin | `useUsers()`, `UsersProvider`, `AppUser` |
| [src/contexts/SubmissionsContext.tsx](src/contexts/SubmissionsContext.tsx) | Form submissions & cars | `useSubmissions()`, `SubmissionsProvider`, `Submission` |
| [src/components/AppSidebar.tsx](src/components/AppSidebar.tsx) | Navigation & role switcher | Sidebar navigation, role switching UI |
| [src/pages/SuperAdminDashboard.tsx](src/pages/SuperAdminDashboard.tsx) | User management | User role assignment, department management |
| [src/App.tsx](src/App.tsx) | Route configuration | All app routes, providers setup |
| [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx) | Login UI | Authentication entry point |
| [src/pages/RegisterPage.tsx](src/pages/RegisterPage.tsx) | Registration UI | User creation with employee role |

---

## 11. Summary: Current State vs Expected State

### ✅ What Works
- Session management with localStorage persistence
- Basic role switching UI in sidebar
- Role-based sidebar navigation
- Multiple admin dashboards for different roles
- Form submission tracking across roles
- User management UI in SuperAdminDashboard

### ⚠️ What Needs Work
- **Backend/Database**: Finish migrating mock Contexts to Supabase PostgreSQL
- **Permission System**: No route guards or permission checks
- **Role Synchronization**: AuthContext and UsersContext not aligned
- **Approval Workflow**: Complex multi-role approval logic (HOS→HOD) but no workflow state machine
- **Data Persistence**: Only user session, not admin changes
- **Security**: No actual password hashing, no JWT, vulnerable to localStorage tampering

---

## Recommendations for Next Phase

1. **Implement Backend Integration**
   - Connect Supabase for persistent user and submission storage
   - Add proper authentication (Supabase Auth)

2. **Add Route Guards**
   - Implement permission middleware
   - Redirect unauthorized access to appropriate error pages

3. **Synchronize Role Systems**
   - Merge AuthContext and UsersContext into single source of truth
   - Standardize role naming convention

4. **Strengthen Security**
   - Implement proper password hashing
   - Add JWT token management
   - Restrict role switching to super_admin only in production

5. **Improve Approval Workflow**
   - Implement state machine for submission status flow
   - Add role inheritance (super_admin can override)
   - Create audit trail for all role changes
