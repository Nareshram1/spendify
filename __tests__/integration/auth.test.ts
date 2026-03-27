/**
 * Integration tests for authentication flows
 */

import { loginUser, signUpUser } from '../../utils/auth';
import { mockUser, mockSupabaseSuccess, mockSupabaseError } from '../helpers/testUtils';
import * as SecureStore from 'expo-secure-store';

describe('Authentication Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('User Signup', () => {
        it('should successfully sign up a new user with valid credentials', async () => {
            const mockAuthData = {
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                },
            };

            // Mock Supabase auth signup
            global.mockSupabase.auth.signUp.mockResolvedValue({
                data: mockAuthData,
                error: null,
            });

            // Mock Supabase insert
            global.mockSupabase.from.mockReturnValue({
                insert: jest.fn().mockResolvedValue({ data: null, error: null }),
            });

            const result = await signUpUser(mockUser.email, mockUser.password, mockUser.fullName);

            expect(result).toBeDefined();
            expect(result?.id).toBe(mockUser.id);
            expect(result?.email).toBe(mockUser.email);
            expect(global.mockSupabase.auth.signUp).toHaveBeenCalledWith({
                email: mockUser.email,
                password: mockUser.password,
                options: {
                    data: {
                        full_name: mockUser.fullName,
                    },
                },
            });
        });

        it('should fail to sign up with duplicate email', async () => {
            global.mockSupabase.auth.signUp.mockResolvedValue({
                data: null,
                error: { message: 'User already registered' },
            });

            await expect(
                signUpUser(mockUser.email, mockUser.password, mockUser.fullName)
            ).rejects.toThrow();
        });

        it('should fail to sign up with weak password', async () => {
            global.mockSupabase.auth.signUp.mockResolvedValue({
                data: null,
                error: { message: 'Password should be at least 6 characters' },
            });

            await expect(
                signUpUser(mockUser.email, 'weak', mockUser.fullName)
            ).rejects.toThrow();
        });

        it('should create user record in database after signup', async () => {
            const mockAuthData = {
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                },
            };

            global.mockSupabase.auth.signUp.mockResolvedValue({
                data: mockAuthData,
                error: null,
            });

            const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
            global.mockSupabase.from.mockReturnValue({
                insert: mockInsert,
            });

            await signUpUser(mockUser.email, mockUser.password, mockUser.fullName);

            expect(global.mockSupabase.from).toHaveBeenCalledWith('users');
            expect(mockInsert).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        user_id: mockUser.id,
                        name: mockUser.fullName,
                        email: mockUser.email,
                    }),
                ])
            );
        });
    });

    describe('User Login', () => {
        it('should successfully login with valid credentials', async () => {
            const mockAuthData = {
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                },
            };

            global.mockSupabase.auth.signInWithPassword.mockResolvedValue({
                data: mockAuthData,
                error: null,
            });

            const result = await loginUser(mockUser.email, mockUser.password);

            expect(result).toBeDefined();
            expect(result.id).toBe(mockUser.id);
            expect(result.email).toBe(mockUser.email);
            expect(global.mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: mockUser.email,
                password: mockUser.password,
            });
        });

        it('should fail to login with invalid credentials', async () => {
            global.mockSupabase.auth.signInWithPassword.mockResolvedValue({
                data: null,
                error: { message: 'Invalid login credentials' },
            });

            await expect(
                loginUser(mockUser.email, 'wrongpassword')
            ).rejects.toThrow();
        });

        it('should fail to login with non-existent email', async () => {
            global.mockSupabase.auth.signInWithPassword.mockResolvedValue({
                data: null,
                error: { message: 'Invalid login credentials' },
            });

            await expect(
                loginUser('nonexistent@example.com', mockUser.password)
            ).rejects.toThrow();
        });

        it('should store user credentials in secure storage after login', async () => {
            const mockAuthData = {
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                },
            };

            global.mockSupabase.auth.signInWithPassword.mockResolvedValue({
                data: mockAuthData,
                error: null,
            });

            await loginUser(mockUser.email, mockUser.password);

            expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_email', mockUser.email);
            expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_id', mockUser.id);
        });
    });

    describe('Session Management', () => {
        it('should persist user session after login', async () => {
            const mockAuthData = {
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                },
            };

            global.mockSupabase.auth.signInWithPassword.mockResolvedValue({
                data: mockAuthData,
                error: null,
            });

            await loginUser(mockUser.email, mockUser.password);

            // Verify session data is stored
            expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
            expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_email', mockUser.email);
            expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_id', mockUser.id);
        });
    });
});
