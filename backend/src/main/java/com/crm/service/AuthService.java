package com.crm.service;

import com.crm.dto.request.LoginRequest;
import com.crm.dto.request.RefreshTokenRequest;
import com.crm.dto.request.RegisterRequest;
import com.crm.dto.response.AuthResponse;

public interface AuthService {
    
    /**
     * Register a new user and tenant
     */
    AuthResponse register(RegisterRequest request);
    
    /**
     * Authenticate user and generate tokens
     */
    AuthResponse login(LoginRequest request);
    
    /**
     * Refresh access token using refresh token
     */
    AuthResponse refreshToken(RefreshTokenRequest request);
}
