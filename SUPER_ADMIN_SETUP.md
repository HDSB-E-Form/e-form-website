# Super Admin User Setup Guide (Supabase)

This guide explains how to create the first Super Admin user or restore Super Admin access if it is ever lost.

The system is designed so that all new users who register are automatically given the `'employee'` role for security. To create an admin, you must manually promote an existing user.

---

## Creating or Restoring the Super Admin

### Step 1: Register the User

First, ensure the user you want to promote already exists in the system. If they don't, have them register through the application's normal **Registration Page**.

For example, they can register with:
- **Email**: `admin.it@company.com`
- **Password**: A secure password

After registration, they will be a standard 'employee'.

### Step 2: Promote the User via SQL

1.  Go to your **Supabase Project Dashboard**.
2.  In the left sidebar, navigate to the **SQL Editor**.
3.  Click **+ New query**.
4.  Enter the following command, replacing the email with the one you want to promote.

    ```sql
    UPDATE public.users
    SET role = 'super_admin'
    WHERE email = 'admin.it@company.com';
    ```

5.  Click **RUN**.

The user is now a Super Admin.

### Step 3: Login and Verify

1.  Go to the application's login page.
2.  Log in with the promoted user's credentials (e.g., `admin.it@company.com`).
3.  You should be automatically redirected to the Super Admin Dashboard and have full administrative access.

This SQL-based promotion is the official and safest way to manage the top-level administrator account.
