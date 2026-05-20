package com.crm.service;

import com.crm.dto.request.LoginRequest;
import com.crm.dto.request.PasswordResetConfirmRequestDTO;
import com.crm.dto.request.PasswordResetRequestDTO;
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

    /**
     * Send a password reset link when a matching account can be resolved.
     */
    void requestPasswordReset(PasswordResetRequestDTO request);

    /**
     * Complete a password reset using a single-use token.
     */
    void resetPassword(PasswordResetConfirmRequestDTO request);
}
