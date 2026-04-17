Phase 1: Backend (API & Database) Enhancements
This phase focuses on the core logic and data model changes required.

Database Schema Update:

booking_occupants table: Add a new nullable column user_id (foreign key to users.id). This will link a BookingOccupant record to a User record once the occupant is converted to a tenant.
users table: No new columns are strictly needed, as existing first_name, last_name, email, phone, sex, date_of_birth can be populated from the BookingOccupant data.
tenant_profiles table: No new columns are strictly needed, as a new TenantProfile will be created for the new User.
New API Endpoint for Occupant-to-Tenant Conversion:

Create a new endpoint (e.g., POST /landlord/bookings/{bookingId}/occupants/{occupantId}/convert-to-tenant).
Input: bookingId, occupantId. Optionally, allow the landlord to provide an email if the occupant record doesn't have one, or to override existing details.
Validation:
Ensure the bookingId and occupantId are valid and belong to the authenticated landlord/caretaker.
Verify the BookingOccupant has not already been converted to a User (check booking_occupants.user_id).
Validate that the BookingOccupant has sufficient data (e.g., first name, last name).
If an email is provided or derived, check for uniqueness against existing users to prevent duplicate accounts. If an existing user is found, decide on a merge strategy or prevent conversion.
Core Logic (within a database transaction):
Retrieve the BookingOccupant record.
Create a new User record with role = 'tenant', populating first_name, last_name, sex, date_of_birth, phone, email from the BookingOccupant. Generate a temporary password (which will be reset via the claim code).
Create a corresponding TenantProfile for the new User.
Update the BookingOccupant record to set its user_id to the ID of the newly created User.
Log this conversion action in the audit logs.
Output: Return the newly created User (tenant) object, possibly with their TenantProfile and a success message.
Update TenantController:

index method: Modify the query to include tenants who originated from BookingOccupant records. This might involve joining with booking_occupants and filtering based on user_id being present. Ensure these tenants are correctly associated with the landlord's properties.
show method: Ensure that when viewing a tenant's details, if they originated from a BookingOccupant, this origin is reflected (e.g., in their history or a specific flag). The existing permission checks (resolveTenantForLandlord, ensureTenantWithinCaretakerScope) should naturally apply as they are now User records.
generateClaimCode method: This method should work as-is for the newly created User records, as they will have the tenant role. Verify this behavior.
Permissions (ResolvesLandlordAccess):

Review ensureCaretakerCanManageTenants and ensureTenantWithinCaretakerScope to confirm they correctly handle tenants originating from proxy bookings. The key is that once converted, they are standard User records with the tenant role, so existing logic should largely apply.
Error Handling:

Implement robust error handling for cases like duplicate emails, missing occupant data, or database failures during conversion.
Phase 2: Frontend (Web & Mobile) Integration
This phase focuses on updating the user interface to expose the new functionality.

PropertySummary / RoomManagement Screens (Web & Mobile):

Identify Proxy Occupants: When viewing details of a proxy booking, identify the BookingOccupant records.
"Convert to Tenant" Action: For each BookingOccupant that has not yet been converted (i.e., user_id is null), display a button or action (e.g., "Register as Tenant").
Confirmation/Input Modal: When the "Register as Tenant" action is triggered, present a modal:
Display the occupant's current details (name, DOB, sex, phone).
Allow the landlord to input/confirm an email address for the new tenant (crucial for account creation).
Add a confirmation step before proceeding.
Loading States & Feedback: Show loading indicators during the API call and provide success/error messages using Toast notifications.
Update UI on Success: After successful conversion, update the UI to reflect that the occupant is now a registered tenant (e.g., change the button to "View Tenant Profile" or "Generate Claim Code").
TenantManagement Screens (Web & Mobile):

Display New Tenants: Ensure the list of tenants correctly displays the newly converted tenants.
Tenant Detail View: When navigating to the detail page of a tenant who originated from a proxy booking, display this information prominently (e.g., "Registered from Proxy Booking: [Booking Reference]").
"Generate Claim Code" Action: For these new tenants, ensure the existing "Generate Claim Code" functionality is accessible and works as expected.
Navigation Updates:

Review CaretakerNavigator.jsx, LandlordNavigator.jsx, TenantNavigator.jsx, and WebNavigator.jsx to ensure that any new routes or modified existing routes (e.g., tenant detail pages) are correctly configured and accessible based on user roles and permissions.
CaretakerLayout.jsx / LandlordLayout.jsx:

These layouts provide the overall structure and navigation. No direct changes are expected here, but they will house the screens that are being updated.
Phase 3: Testing Strategy
A comprehensive testing approach is crucial for a feature that touches multiple core modules.

Unit Tests:

For the new API endpoint: Test validation rules, successful conversion, and various error scenarios (e.g., duplicate email, invalid IDs).
For TenantController modifications: Ensure index and show correctly retrieve and display the new tenant types.
Integration Tests:

Test the full flow from creating a proxy booking, to converting an occupant, to viewing them in tenant management, and finally generating a claim code.
Test caretaker permissions throughout the process.
End-to-End (E2E) / UI Tests:

Automate tests for the frontend user flows on both web and mobile.
Verify UI elements appear/disappear correctly based on conversion status.
Manual Testing:

Landlord Perspective:
Create a proxy booking with multiple occupants.
Convert one occupant to a tenant.
Verify the new tenant appears in TenantManagement.
Generate a claim code for the new tenant.
Attempt to convert an already converted occupant.
Attempt to convert an occupant with an email that already exists in the system.
Caretaker Perspective:
Repeat the above steps, ensuring all actions are correctly gated by their assigned permissions.
Edge Cases:
What if a BookingOccupant has no email? The conversion process should prompt for one.
What if a BookingOccupant has an email that matches an existing User (non-tenant role or even tenant role)? This needs a clear resolution (e.g., prevent conversion, link to existing, or prompt for new email).
Test with different property types and billing policies to ensure no unexpected side effects.
This plan provides a structured approach to adding the "convert proxy occupant to tenant" feature. It addresses the necessary backend, frontend, and testing considerations to ensure a robust and well-integrated solution.