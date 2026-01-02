import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Dimensions,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getCategoriesForUser } from '../../utils/database';
import { Ionicons } from '@expo/vector-icons';
import {
    RecurringExpenseModalProps,
    RecurringExpenseFormData,
    RecurrenceInterval,
    CustomIntervalUnit,
    EndCondition,
} from '../../utils/recurringExpenseTypes';

const { width } = Dimensions.get('window');

type Category = {
    id: string;
    name: string;
    user_id: string;
};

const RecurringExpenseModal: React.FC<RecurringExpenseModalProps> = ({
    visible,
    recurringExpense,
    onClose,
    onSave,
    onDelete,
    userID,
}) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState<RecurringExpenseFormData>({
        amount: '',
        category_id: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        recurrence_interval: 'monthly',
        custom_interval_value: '1',
        custom_interval_unit: 'weeks',
        end_condition: 'never',
        end_date: '',
        occurrence_count: '12',
    });
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const cats = await getCategoriesForUser(userID);
                setCategories(cats);

                if (recurringExpense) {
                    // Edit mode - populate form
                    setFormData({
                        amount: recurringExpense.amount.toString(),
                        category_id: recurringExpense.category_id,
                        description: recurringExpense.description,
                        start_date: recurringExpense.start_date ? recurringExpense.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
                        recurrence_interval: recurringExpense.recurrence_interval,
                        custom_interval_value: recurringExpense.custom_interval_value?.toString() || '1',
                        custom_interval_unit: recurringExpense.custom_interval_unit || 'weeks',
                        end_condition: recurringExpense.end_condition,
                        end_date: recurringExpense.end_date ? recurringExpense.end_date.split('T')[0] : '',
                        occurrence_count: recurringExpense.occurrence_count?.toString() || '12',
                    });
                    setIsActive(recurringExpense.is_active);
                } else {
                    // Create mode - set default category
                    if (cats.length > 0) {
                        setFormData(prev => ({ ...prev, category_id: cats[0].id }));
                    }
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
                Alert.alert('Error', 'Failed to load categories.');
            }
        };

        if (userID && visible) {
            fetchCategories();
        }
    }, [userID, recurringExpense, visible]);

    const handleSave = async () => {
        try {
            // Validation
            if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
                Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
                return;
            }
            if (!formData.category_id) {
                Alert.alert('Missing Category', 'Please select a category.');
                return;
            }
            if (!formData.description.trim()) {
                Alert.alert('Missing Description', 'Please enter a description.');
                return;
            }

            // Validate custom interval
            if (formData.recurrence_interval === 'custom') {
                const customValue = parseInt(formData.custom_interval_value);
                if (isNaN(customValue) || customValue <= 0) {
                    Alert.alert('Invalid Interval', 'Please enter a valid interval value.');
                    return;
                }
            }

            // Validate end condition
            if (formData.end_condition === 'on_date') {
                if (!formData.end_date) {
                    Alert.alert('Missing End Date', 'Please select an end date.');
                    return;
                }
                const endDate = new Date(formData.end_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (endDate < today) {
                    Alert.alert('Invalid Date', 'End date must be in the future.');
                    return;
                }
            }

            if (formData.end_condition === 'after_occurrences') {
                const count = parseInt(formData.occurrence_count);
                if (isNaN(count) || count <= 0) {
                    Alert.alert('Invalid Count', 'Please enter a valid occurrence count.');
                    return;
                }
            }

            // Prepare data
            const expenseData: any = {
                amount: parseFloat(formData.amount),
                category_id: formData.category_id,
                description: formData.description.trim(),
                start_date: new Date(formData.start_date).toISOString(),
                recurrence_interval: formData.recurrence_interval,
                end_condition: formData.end_condition,
                is_active: isActive,
            };

            if (recurringExpense) {
                expenseData.id = recurringExpense.id;
            }

            if (formData.recurrence_interval === 'custom') {
                expenseData.custom_interval_value = parseInt(formData.custom_interval_value);
                expenseData.custom_interval_unit = formData.custom_interval_unit;
            }

            if (formData.end_condition === 'on_date') {
                expenseData.end_date = new Date(formData.end_date).toISOString();
            }

            if (formData.end_condition === 'after_occurrences') {
                expenseData.occurrence_count = parseInt(formData.occurrence_count);
            }

            await onSave(expenseData);
            resetForm();
            onClose();
        } catch (err) {
            console.error('Error saving recurring expense:', err);
            Alert.alert('Error', 'Failed to save recurring expense. Please try again.');
        }
    };

    const handleDelete = async () => {
        if (!recurringExpense || !onDelete) return;

        Alert.alert(
            'Delete Recurring Expense',
            'Are you sure you want to delete this recurring expense? This will not delete already created expenses.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await onDelete(recurringExpense.id);
                        resetForm();
                        onClose();
                    },
                },
            ]
        );
    };

    const resetForm = () => {
        setFormData({
            amount: '',
            category_id: categories.length > 0 ? categories[0].id : '',
            description: '',
            start_date: new Date().toISOString().split('T')[0],
            recurrence_interval: 'monthly',
            custom_interval_value: '1',
            custom_interval_unit: 'weeks',
            end_condition: 'never',
            end_date: '',
            occurrence_count: '12',
        });
        setIsActive(true);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleClose}>
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {recurringExpense ? 'Edit Recurring Expense' : 'New Recurring Expense'}
                            </Text>
                            <TouchableOpacity onPress={handleClose} style={styles.closeIcon}>
                                <Ionicons name="close-circle-outline" size={26} color="#B0B0B0" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.scrollViewContent}>
                            {/* Amount */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Amount:</Text>
                                <TextInput
                                    value={formData.amount}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, amount: text.replace(/[^0-9.]/g, '') })
                                    }
                                    keyboardType="numeric"
                                    placeholder="Enter amount"
                                    placeholderTextColor="#888"
                                    style={styles.textInput}
                                />
                            </View>

                            {/* Category */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Category:</Text>
                                <View style={styles.pickerWrapper}>
                                    <Picker
                                        selectedValue={formData.category_id}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, category_id: value })
                                        }
                                        style={styles.picker}
                                        itemStyle={styles.pickerItem}
                                    >
                                        {categories.length === 0 ? (
                                            <Picker.Item label="No categories available" value="" enabled={false} />
                                        ) : (
                                            categories.map((cat) => (
                                                <Picker.Item key={cat.id} value={cat.id} label={cat.name} />
                                            ))
                                        )}
                                    </Picker>
                                </View>
                            </View>

                            {/* Description */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Description:</Text>
                                <TextInput
                                    value={formData.description}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, description: text })
                                    }
                                    placeholder="e.g., Monthly rent, Weekly groceries"
                                    placeholderTextColor="#888"
                                    style={styles.textInput}
                                    maxLength={100}
                                />
                            </View>

                            {/* Start Date */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Start Date:</Text>
                                <TextInput
                                    value={formData.start_date}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, start_date: text })
                                    }
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="#888"
                                    style={styles.textInput}
                                />
                                <Text style={styles.helperText}>When should the first expense be created?</Text>
                            </View>

                            {/* Recurrence Interval */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Repeat:</Text>
                                <View style={styles.pickerWrapper}>
                                    <Picker
                                        selectedValue={formData.recurrence_interval}
                                        onValueChange={(value: RecurrenceInterval) =>
                                            setFormData({ ...formData, recurrence_interval: value })
                                        }
                                        style={styles.picker}
                                        itemStyle={styles.pickerItem}
                                    >
                                        <Picker.Item label="Daily" value="daily" />
                                        <Picker.Item label="Weekly" value="weekly" />
                                        <Picker.Item label="Monthly" value="monthly" />
                                        <Picker.Item label="Yearly" value="yearly" />
                                        <Picker.Item label="Custom" value="custom" />
                                    </Picker>
                                </View>
                            </View>

                            {/* Custom Interval */}
                            {formData.recurrence_interval === 'custom' && (
                                <View style={styles.customIntervalContainer}>
                                    <View style={styles.customIntervalRow}>
                                        <View style={styles.customIntervalInput}>
                                            <Text style={styles.inputLabel}>Every:</Text>
                                            <TextInput
                                                value={formData.custom_interval_value}
                                                onChangeText={(text) =>
                                                    setFormData({ ...formData, custom_interval_value: text.replace(/[^0-9]/g, '') })
                                                }
                                                keyboardType="numeric"
                                                placeholder="1"
                                                placeholderTextColor="#888"
                                                style={styles.textInput}
                                            />
                                        </View>
                                        <View style={styles.customIntervalPicker}>
                                            <Text style={styles.inputLabel}>Unit:</Text>
                                            <View style={styles.pickerWrapper}>
                                                <Picker
                                                    selectedValue={formData.custom_interval_unit}
                                                    onValueChange={(value: CustomIntervalUnit) =>
                                                        setFormData({ ...formData, custom_interval_unit: value })
                                                    }
                                                    style={styles.picker}
                                                    itemStyle={styles.pickerItem}
                                                >
                                                    <Picker.Item label="Days" value="days" />
                                                    <Picker.Item label="Weeks" value="weeks" />
                                                    <Picker.Item label="Months" value="months" />
                                                    <Picker.Item label="Years" value="years" />
                                                </Picker>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* End Condition */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>End:</Text>
                                <View style={styles.pickerWrapper}>
                                    <Picker
                                        selectedValue={formData.end_condition}
                                        onValueChange={(value: EndCondition) =>
                                            setFormData({ ...formData, end_condition: value })
                                        }
                                        style={styles.picker}
                                        itemStyle={styles.pickerItem}
                                    >
                                        <Picker.Item label="Never" value="never" />
                                        <Picker.Item label="On Date" value="on_date" />
                                        <Picker.Item label="After Occurrences" value="after_occurrences" />
                                    </Picker>
                                </View>
                            </View>

                            {/* End Date */}
                            {formData.end_condition === 'on_date' && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>End Date:</Text>
                                    <TextInput
                                        value={formData.end_date}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, end_date: text })
                                        }
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#888"
                                        style={styles.textInput}
                                    />
                                    <Text style={styles.helperText}>Format: YYYY-MM-DD (e.g., 2026-12-31)</Text>
                                </View>
                            )}

                            {/* Occurrence Count */}
                            {formData.end_condition === 'after_occurrences' && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Number of Times:</Text>
                                    <TextInput
                                        value={formData.occurrence_count}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, occurrence_count: text.replace(/[^0-9]/g, '') })
                                        }
                                        keyboardType="numeric"
                                        placeholder="12"
                                        placeholderTextColor="#888"
                                        style={styles.textInput}
                                    />
                                </View>
                            )}

                            {/* Active Toggle */}
                            <View style={styles.inputGroup}>
                                <View style={styles.switchRow}>
                                    <Text style={styles.inputLabel}>Active:</Text>
                                    <Switch
                                        value={isActive}
                                        onValueChange={setIsActive}
                                        trackColor={{ false: '#767577', true: '#4ECDC4' }}
                                        thumbColor={isActive ? '#fff' : '#f4f3f4'}
                                    />
                                </View>
                                <Text style={styles.helperText}>
                                    {isActive ? 'Expenses will be created automatically' : 'Paused - no expenses will be created'}
                                </Text>
                            </View>
                        </ScrollView>

                        {/* Action Buttons */}
                        <View style={styles.actionButtonsContainer}>
                            <TouchableOpacity style={styles.actionButtonSave} onPress={handleSave}>
                                <Ionicons name="save-outline" size={20} color="white" style={styles.buttonIcon} />
                                <Text style={styles.buttonText}>Save</Text>
                            </TouchableOpacity>
                            {recurringExpense && onDelete && (
                                <TouchableOpacity style={styles.actionButtonDelete} onPress={handleDelete}>
                                    <Ionicons name="trash-outline" size={20} color="white" style={styles.buttonIcon} />
                                    <Text style={styles.buttonText}>Delete</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: width * 0.90,
        backgroundColor: '#2C2C2E',
        borderRadius: 15,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
        flex: 1,
        textAlign: 'left',
    },
    closeIcon: {
        padding: 5,
    },
    scrollViewContent: {
        paddingBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        color: '#E0E0E0',
        fontSize: 15,
        marginBottom: 8,
        fontWeight: 'bold',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 15,
        fontSize: 16,
        backgroundColor: '#1E1E1E',
        color: '#FFFFFF',
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#1E1E1E',
    },
    picker: {
        color: 'white',
        height: 50,
        width: '100%',
    },
    pickerItem: {
        color: 'white',
        fontSize: 16,
    },
    customIntervalContainer: {
        marginBottom: 20,
    },
    customIntervalRow: {
        flexDirection: 'row',
        gap: 10,
    },
    customIntervalInput: {
        flex: 1,
    },
    customIntervalPicker: {
        flex: 1.5,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    helperText: {
        color: '#888',
        fontSize: 12,
        marginTop: 5,
        fontStyle: 'italic',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
        paddingHorizontal: 5,
    },
    actionButtonSave: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        borderRadius: 25,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    actionButtonDelete: {
        backgroundColor: '#FF6B6B',
        paddingVertical: 12,
        borderRadius: 25,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 5,
    },
    buttonIcon: {
        marginRight: 5,
    },
});

export default RecurringExpenseModal;
