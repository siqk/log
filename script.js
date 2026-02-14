// Supabase configuration
const SUPABASE_URL = 'https://opixidygpndbfuisjkrk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_N6RdTgjgUHQbdtvPX9uPqA_VTraUegI';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Global state
let currentUser = null;
let currentSession = null;

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkUser();
    setupPage();
});

// Check user session
async function checkUser() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        currentSession = session;
        currentUser = session?.user ?? null;
        
        // Set up auth state change listener
        supabase.auth.onAuthStateChange((event, session) => {
            currentSession = session;
            currentUser = session?.user ?? null;
            
            if (event === 'SIGNED_IN') {
                console.log('User signed in:', session?.user?.email);
                window.location.href = 'dashboard.html';
            } else if (event === 'SIGNED_OUT') {
                console.log('User signed out');
                window.location.href = 'login.html';
            }
        });
    } catch (error) {
        console.error('Error checking user:', error);
    }
}

// Setup page based on current URL
function setupPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    
    // Redirect based on auth status
    if (currentUser) {
        // If logged in and on public pages, go to dashboard
        if (['login.html', 'signup.html', 'index.html', ''].includes(filename)) {
            window.location.href = 'dashboard.html';
            return;
        }
    } else {
        // If not logged in and on protected pages, go to login
        if (['dashboard.html', 'profile.html', 'create-post.html'].includes(filename)) {
            window.location.href = 'login.html';
            return;
        }
    }
    
    // Initialize page-specific functionality
    if (filename === 'login.html') {
        initializeLogin();
    } else if (filename === 'signup.html') {
        initializeSignup();
    } else if (filename === 'dashboard.html') {
        initializeDashboard();
    } else if (filename === 'profile.html') {
        initializeProfile();
    } else if (filename === 'create-post.html') {
        initializeCreatePost();
    }
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Login functionality
function initializeLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Clear messages
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        errorMessage.textContent = '';
        successMessage.textContent = '';
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            // Log activity
            if (data.user) {
                await logUserActivity(data.user.id, 'user_login', { 
                    email: email
                });
            }
            
            successMessage.textContent = 'Login successful! Redirecting...';
            successMessage.style.display = 'block';
            
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
    
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Clear messages
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        errorMessage.textContent = '';
        successMessage.textContent = '';
        
        // Validate password
        if (password.length < 6) {
            errorMessage.textContent = 'Password must be at least 6 characters long';
            errorMessage.style.display = 'block';
            return;
        }
        
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
            
            if (data.user) {
                successMessage.textContent = 'Signup successful! Please check your email for confirmation.';
                successMessage.style.display = 'block';
                
                // Clear form
                signupForm.reset();
            }
            
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    });
}

// Dashboard functionality
async function initializeDashboard() {
    if (!currentUser) return;
    
    const userInfo = document.getElementById('userInfo');
    const memberSince = document.getElementById('memberSince');
    const lastLogin = document.getElementById('lastLogin');
    const recentActivity = document.getElementById('recentActivity');
    const postsContainer = document.getElementById('postsContainer');
    
    try {
        // Show loading
        userInfo.innerHTML = '<div class="loading">Loading your information...</div>';
        
        // Get profile data
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile error:', profileError);
        }
        
        // Get user activity
        const { data: activities, error: activityError } = await supabase
            .from('user_activity')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (activityError) console.error('Activity error:', activityError);
        
        // Get user posts
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (postsError) console.error('Posts error:', postsError);
        
        // Display user information
        const createdAt = new Date(currentUser.created_at).toLocaleDateString();
        const lastSignIn = currentUser.last_sign_in_at 
            ? new Date(currentUser.last_sign_in_at).toLocaleString() 
            : 'First login';
        
        userInfo.innerHTML = `
            <div class="user-info-card">
                <p><strong>Name:</strong> ${profile?.full_name || currentUser.user_metadata?.full_name || 'Not provided'}</p>
                <p><strong>Email:</strong> ${currentUser.email}</p>
                <p><strong>Location:</strong> ${profile?.location || 'Not set'}</p>
                <p><strong>Bio:</strong> ${profile?.bio || 'No bio yet'}</p>
                <p><strong>Member since:</strong> ${createdAt}</p>
                <a href="profile.html" class="btn btn-secondary" style="margin-top: 1rem;">Edit Profile</a>
            </div>
        `;
        
        memberSince.textContent = createdAt;
        lastLogin.textContent = lastSignIn;
        
        // Display recent activity
        if (activities && activities.length > 0) {
            recentActivity.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">📋</div>
                    <div class="activity-details">
                        <p><strong>${activity.action.replace(/_/g, ' ')}</strong></p>
                        <small>${new Date(activity.created_at).toLocaleString()}</small>
                    </div>
                </div>
            `).join('');
        } else {
            recentActivity.innerHTML = '<p class="no-data">No recent activity</p>';
        }
        
        // Display posts
        if (posts && posts.length > 0) {
            postsContainer.innerHTML = posts.map(post => `
                <div class="post-card">
                    <h4>${post.title}</h4>
                    <p>${post.content || 'No content'}</p>
                    <div class="post-meta">
                        <small>Posted: ${new Date(post.created_at).toLocaleDateString()}</small>
                    </div>
                </div>
            `).join('');
        } else {
            postsContainer.innerHTML = '<p class="no-data">No posts yet. <a href="create-post.html">Create your first post</a></p>';
        }
        
        // Log dashboard view
        await logUserActivity(currentUser.id, 'viewed_dashboard', {});
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        userInfo.innerHTML = '<p class="error-message">Error loading user information. Please refresh the page.</p>';
    }
}

// Profile page functionality
async function initializeProfile() {
    if (!currentUser) return;
    
    const profileForm = document.getElementById('profileForm');
    if (!profileForm) return;
    
    const messageDiv = document.getElementById('profileMessage');
    
    try {
        // Load current profile data
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (profile) {
            document.getElementById('fullName').value = profile.full_name || '';
            document.getElementById('bio').value = profile.bio || '';
            document.getElementById('phone').value = profile.phone || '';
            document.getElementById('location').value = profile.location || '';
            document.getElementById('website').value = profile.website || '';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
    
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const bio = document.getElementById('bio').value;
        const phone = document.getElementById('phone').value;
        const location = document.getElementById('location').value;
        const website = document.getElementById('website').value;
        
        messageDiv.style.display = 'none';
        messageDiv.className = 'message';
        
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: currentUser.id,
                    full_name: fullName,
                    bio: bio,
                    phone: phone,
                    location: location,
                    website: website,
                    updated_at: new Date()
                });
            
            if (error) throw error;
            
            // Update user metadata
            await supabase.auth.updateUser({
                data: { full_name: fullName }
            });
            
            // Log activity
            await logUserActivity(currentUser.id, 'updated_profile', {});
            
            messageDiv.textContent = 'Profile updated successfully! Redirecting...';
            messageDiv.className = 'message success-message';
            messageDiv.style.display = 'block';
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } catch (error) {
            messageDiv.textContent = error.message;
            messageDiv.className = 'message error-message';
            messageDiv.style.display = 'block';
        }
    });
}

// Create post functionality
async function initializeCreatePost() {
    if (!currentUser) return;
    
    const postForm = document.getElementById('postForm');
    if (!postForm) return;
    
    const messageDiv = document.getElementById('postMessage');
    
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        
        messageDiv.style.display = 'none';
        messageDiv.className = 'message';
        
        try {
            const { data, error } = await supabase
                .from('posts')
                .insert([{
                    user_id: currentUser.id,
                    title: title,
                    content: content
                }])
                .select();
            
            if (error) throw error;
            
            // Log activity
            await logUserActivity(currentUser.id, 'created_post', { 
                title: title,
                post_id: data[0].id
            });
            
            messageDiv.textContent = 'Post created successfully! Redirecting...';
            messageDiv.className = 'message success-message';
            messageDiv.style.display = 'block';
            
            postForm.reset();
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } catch (error) {
            messageDiv.textContent = error.message;
            messageDiv.className = 'message error-message';
            messageDiv.style.display = 'block';
        }
    });
}

// Log user activity
async function logUserActivity(userId, action, details = {}) {
    try {
        const { error } = await supabase
            .from('user_activity')
            .insert([{
                user_id: userId,
                action: action,
                details: details
            }]);
        
        if (error) throw error;
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Logout functionality
async function handleLogout() {
    try {
        if (currentUser) {
            await logUserActivity(currentUser.id, 'user_logout', {});
        }
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
    } catch (error) {
        console.error('Error logging out:', error);
    }
}