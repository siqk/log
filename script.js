// Supabase configuration
const SUPABASE_URL = 'https://opixidygpndbfuisjkrk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_N6RdTgjgUHQbdtvPX9uPqA_VTraUegI';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check which page we're on
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    // Redirect logic
    if (user) {
        if (path.includes('login.html') || path.includes('signup.html') || path === '/' || path.endsWith('index.html')) {
            window.location.href = 'dashboard.html';
        }
    } else {
        if (path.includes('dashboard.html')) {
            window.location.href = 'login.html';
        }
    }
    
    // Page-specific initialization
    if (path.includes('login.html')) {
        initializeLogin();
    } else if (path.includes('signup.html')) {
        initializeSignup();
    } else if (path.includes('dashboard.html')) {
        initializeDashboard();
    }
    
    // Initialize logout button if it exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

// Login functionality
function initializeLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            // Login successful - redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    });
}

// Signup functionality
function initializeSignup() {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;
    
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        
        // Clear previous messages
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: name
                    }
                }
            });
            
            if (error) throw error;
            
            // Check if email confirmation is required
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                successMessage.textContent = 'Signup successful! Please check your email for confirmation.';
            } else {
                successMessage.textContent = 'Signup successful! You can now login.';
            }
            successMessage.style.display = 'block';
            
            // Clear form
            signupForm.reset();
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
            
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    });
}

// Dashboard functionality
async function initializeDashboard() {
    const userInfo = document.getElementById('userInfo');
    const memberSince = document.getElementById('memberSince');
    const lastLogin = document.getElementById('lastLogin');
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (user) {
            // Display user information
            const createdAt = new Date(user.created_at).toLocaleDateString();
            const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A';
            
            userInfo.innerHTML = `
                <p><strong>Name:</strong> ${user.user_metadata?.full_name || 'Not provided'}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>User ID:</strong> ${user.id}</p>
            `;
            
            memberSince.textContent = createdAt;
            lastLogin.textContent = lastSignIn;
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        userInfo.innerHTML = '<p class="error">Error loading user information</p>';
    }
}

// Logout functionality
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error logging out:', error);
    }
}