import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getValueFor } from '../../utils/secureStore';
import { RecurringExpense } from '../../utils/recurringExpenseTypes';
import {
    getRecurringExpenses,
    saveRecurringExpense,
    deleteRecurringExpense,
    toggleRecurringExpenseStatus,
} from '../../utils/recurringExpenseDB';
import {
    getRecurrenceDescription,
    getNextDueDateString,
    processRecurringExpenses,
} from '../../utils/recurringExpenseProcessor';
import RecurringExpenseModal from '../components/RecurringExpenseModal';
import { getCategoriesForUser } from '../../utils/database';

type Category = {
    id: string;
    name: string;
    user_id: string;
};

export default function AutomationScreen() {
    const [userID, setUserID] = useState<string>('');
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<RecurringExpense | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const storedUserId = await getValueFor('user_id');
            if (storedUserId) {
                setUserID(storedUserId);
                await loadData(storedUserId);
            } else {
                router.replace('/login');
            }
        };

        fetchUser();
    }, []);

    const loadData = async (userId: string) => {
        try {
            setLoading(true);

            // Load categories
            const cats = await getCategoriesForUser(userId);
            setCategories(cats);

            // Load recurring expenses
            const expenses = await getRecurringExpenses(userId);
            setRecurringExpenses(expenses);

            // Process any due recurring expenses
            await processRecurringExpenses(userId);
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load recurring expenses.');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        if (!userID) return;
        setRefreshing(true);
        await loadData(userID);
        setRefreshing(false);
    }, [userID]);

    const handleAddNew = () => {
        setSelectedExpense(null);
        setModalVisible(true);
    };

    const handleEdit = (expense: RecurringExpense) => {
        setSelectedExpense(expense);
        setModalVisible(true);
    };

    const handleSave = async (expenseData: Partial<RecurringExpense>) => {
        try {
            await saveRecurringExpense(userID, expenseData);
            await loadData(userID);
            Alert.alert('Success', 'Recurring expense saved successfully!');
        } catch (error) {
            console.error('Error saving recurring expense:', error);
            Alert.alert('Error', 'Failed to save recurring expense.');
        }
    };

    const handleDelete = async (expenseId: string) => {
        try {
            await deleteRecurringExpense(userID, expenseId);
            await loadData(userID);
            Alert.alert('Success', 'Recurring expense deleted successfully!');
        } catch (error) {
            console.error('Error deleting recurring expense:', error);
            Alert.alert('Error', 'Failed to delete recurring expense.');
        }
    };

    const handleToggleStatus = async (expense: RecurringExpense) => {
        try {
            await toggleRecurringExpenseStatus(userID, expense.id);
            await loadData(userID);
        } catch (error) {
            console.error('Error toggling status:', error);
            Alert.alert('Error', 'Failed to update status.');
        }
    };

    const getCategoryName = (categoryId: string): string => {
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : 'Unknown';
    };

    const renderExpenseItem = ({ item }: { item: RecurringExpense }) => {
        const categoryName = getCategoryName(item.category_id);
        const recurrenceDesc = getRecurrenceDescription(item);
        const nextDueDate = getNextDueDateString(item);
        const isOverdue = nextDueDate === 'Overdue';

        return (
            <TouchableOpacity
                style={[styles.expenseCard, !item.is_active && styles.inactiveCard]}
                onPress={() => handleEdit(item)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.expenseAmount}>₹{item.amount.toFixed(2)}</Text>
                        {!item.is_active && (
                            <View style={styles.inactiveBadge}>
                                <Text style={styles.inactiveBadgeText}>Paused</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={() => handleToggleStatus(item)}
                        style={styles.toggleButton}
                    >
                        <Ionicons
                            name={item.is_active ? 'pause-circle' : 'play-circle'}
                            size={28}
                            color={item.is_active ? '#FF9800' : '#4CAF50'}
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.detailRow}>
                        <Ionicons name="pricetag-outline" size={16} color="#B0B0B0" />
                        <Text style={styles.detailText}>{categoryName}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Ionicons name="document-text-outline" size={16} color="#B0B0B0" />
                        <Text style={styles.detailText}>{item.description}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Ionicons name="repeat-outline" size={16} color="#B0B0B0" />
                        <Text style={styles.detailText}>{recurrenceDesc}</Text>
                    </View>

                    {item.is_active && (
                        <View style={styles.detailRow}>
                            <Ionicons
                                name="calendar-outline"
                                size={16}
                                color={isOverdue ? '#FF6B6B' : '#4ECDC4'}
                            />
                            <Text style={[styles.detailText, isOverdue && styles.overdueText]}>
                                Next: {nextDueDate}
                            </Text>
                        </View>
                    )}

                    {item.occurrences_created > 0 && (
                        <View style={styles.detailRow}>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                            <Text style={styles.detailText}>
                                Created: {item.occurrences_created} time{item.occurrences_created !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="repeat-outline" size={80} color="#444" />
            <Text style={styles.emptyStateTitle}>No Recurring Expenses</Text>
            <Text style={styles.emptyStateText}>
                Automate your regular expenses like rent, subscriptions, and bills.
            </Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={handleAddNew}>
                <Ionicons name="add-circle-outline" size={24} color="white" />
                <Text style={styles.emptyStateButtonText}>Create Your First</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar backgroundColor="#171223" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4ECDC4" />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#171223" />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Recurring Expenses</Text>
                <TouchableOpacity onPress={handleAddNew} style={styles.addButton}>
                    <Ionicons name="add-circle" size={32} color="#4ECDC4" />
                </TouchableOpacity>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
                <Ionicons name="information-circle-outline" size={20} color="#4ECDC4" />
                <Text style={styles.infoBannerText}>
                    Expenses are created automatically when you open the app
                </Text>
            </View>

            {/* List */}
            <FlatList
                data={recurringExpenses}
                renderItem={renderExpenseItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#4ECDC4"
                        colors={['#4ECDC4']}
                    />
                }
                ListEmptyComponent={renderEmptyState}
            />

            {/* Modal */}
            <RecurringExpenseModal
                visible={modalVisible}
                recurringExpense={selectedExpense}
                onClose={() => {
                    setModalVisible(false);
                    setSelectedExpense(null);
                }}
                onSave={handleSave}
                onDelete={handleDelete}
                userID={userID}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#171223',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#FFFFFF',
        marginTop: 10,
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        flex: 1,
        textAlign: 'center',
    },
    addButton: {
        padding: 5,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginHorizontal: 15,
        marginTop: 15,
        borderRadius: 10,
        gap: 10,
    },
    infoBannerText: {
        color: '#E0E0E0',
        fontSize: 13,
        flex: 1,
    },
    listContent: {
        padding: 15,
        flexGrow: 1,
    },
    expenseCard: {
        backgroundColor: '#2C2C2E',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#444',
    },
    inactiveCard: {
        opacity: 0.6,
        borderColor: '#666',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    expenseAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#A9FDD8',
    },
    inactiveBadge: {
        backgroundColor: '#FF9800',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 5,
    },
    inactiveBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    toggleButton: {
        padding: 5,
    },
    cardBody: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        color: '#E0E0E0',
        fontSize: 14,
        flex: 1,
    },
    overdueText: {
        color: '#FF6B6B',
        fontWeight: 'bold',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    emptyStateTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginTop: 20,
        marginBottom: 10,
    },
    emptyStateText: {
        fontSize: 15,
        color: '#B0B0B0',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
    },
    emptyStateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4ECDC4',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
    },
    emptyStateButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
