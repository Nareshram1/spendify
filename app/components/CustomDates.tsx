import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import DatePickerModal from './DatePickerModal';
import { supabase } from '@/utils/supabaseClient';
import { PieChart } from 'react-native-chart-kit';
import { MaterialIcons } from '@expo/vector-icons';

const CustomDate = ({ userID }: { userID: string }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [showPie, setShowPie] = useState<boolean>(false);
    const [total, setTotal] = useState<number>(0);
    const [data, setData] = useState<any>();
    const [selectedDateSt, setSelectedDateSt] = useState<string>(() => {
        const istOffset = 5.5 * 60 * 60000;
        return new Date(new Date().getTime() + istOffset).toISOString().split('T')[0];
    });
    const [selectedDateEnd, setSelectedDateEnd] = useState<string>(() => {
        const istOffset = 5.5 * 60 * 60000;
        return new Date(new Date().getTime() + istOffset).toISOString().split('T')[0];
    });
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [stEnd, setStEnd] = useState<string>('st');

    const handleDateChangeSt = (selectedDateSt: string) => {
        setSelectedDateSt(selectedDateSt);
        setShowPie(false);
    };
    
    const handleDateChangeEnd = (selectedDateEnd: string) => {
        setSelectedDateEnd(selectedDateEnd);
        setShowPie(false);
    };

    // Color palette remains the same
    const usedColors = new Set();
    const getRandomColor = () => {
        const colors = [
            '#FF66D4', '#FEAE65', '#E6F690', '#AADEA7', '#64C2A6', '#2D87BB',
            '#fd7f6f', '#7eb0d5', '#b2e061', '#bd7ebe', '#ffb55a', '#ffee65',
            '#beb9db', '#fdcce5', '#8bd3c7'
        ];

        const availableColors = colors.filter(color => !usedColors.has(color));
        if (availableColors.length === 0) {
            usedColors.clear();
            availableColors.push(...colors);
        }
        const randomIndex = Math.floor(Math.random() * availableColors.length);
        const selectedColor = availableColors[randomIndex];
        usedColors.add(selectedColor);
        return selectedColor;
    };

    const handleCustomDate = async () => {
        const startDate = new Date(selectedDateSt);
        const endDate = new Date(selectedDateEnd);
        
        if (endDate <= startDate) {
            alert('End date must be after start date');
            return;
        }

        setIsLoading(true);
        try {
            const { data: expenseData, error } = await supabase
                .from('expenses')
                .select('amount, category:categories ( name )')
                .eq('user_id', userID)
                .gte('expense_date', selectedDateSt)
                .lte('expense_date', selectedDateEnd);

            if (error) throw error;
            if (!expenseData || expenseData.length === 0) {
                alert('No expenses found for the selected date range');
                setShowPie(false);
                return;
            }

            let sum = 0;
            const categorizedExpensesPieData = expenseData.reduce((acc, expense) => {
                //@ts-ignore
                const categoryName = expense.category.name.trim();
                const existingCategory = acc.find(item => item.name === categoryName);

                if (existingCategory) {
                    existingCategory.amount += expense.amount;
                } else {
                    acc.push({
                        name: categoryName,
                        amount: expense.amount,
                        color: getRandomColor(),
                        legendFontColor: '#FFFFFF',
                        legendFontSize: 12,
                    });
                }
                sum += expense.amount;
                return acc;
            }, [] as any[]);

            setTotal(sum);
            setData(categorizedExpensesPieData);
            setShowPie(true);
        } catch (error) {
            alert('Error fetching expense data');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerSubtitle}>Select date range to analyze expenses</Text>
            </View>

            <View style={styles.datePickerContainer}>
                <DatePickerModal
                    openModal={showDatePicker}
                    setOpenModal={setShowDatePicker}
                    selectedDate={stEnd === 'st' ? selectedDateSt : selectedDateEnd}
                    handleDateChange={stEnd === 'st' ? handleDateChangeSt : handleDateChangeEnd}
                />

                <View style={styles.dateRangeContainer}>
                    <Pressable
                        style={styles.dateButton}
                        onPress={() => {
                            setStEnd('st');
                            setShowDatePicker(true);
                        }}
                    >
                        <MaterialIcons name="calendar-today" size={20} color="#0ac7b8" />
                        <Text style={styles.dateText}>{selectedDateSt}</Text>
                    </Pressable>

                    <View style={styles.dateRangeDivider}>
                        <Text style={styles.dividerText}>to</Text>
                    </View>

                    <Pressable
                        style={styles.dateButton}
                        onPress={() => {
                            setStEnd('end');
                            setShowDatePicker(true);
                        }}
                    >
                        <MaterialIcons name="calendar-today" size={20} color="#0ac7b8" />
                        <Text style={styles.dateText}>{selectedDateEnd}</Text>
                    </Pressable>
                </View>

                <Pressable
                    style={[styles.analyzeButton, isLoading && styles.analyzeButtonDisabled]}
                    onPress={handleCustomDate}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.analyzeButtonText}>Analyze Expenses</Text>
                    )}
                </Pressable>
            </View>

            <View style={styles.chartContainer}>
                {showPie ? (
                    <>
                        <PieChart
                            data={data}
                            width={Dimensions.get('window').width - 32}
                            height={220}
                            chartConfig={{
                                backgroundColor: '#171223',
                                backgroundGradientFrom: '#171223',
                                backgroundGradientTo: '#171223',
                                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                            }}
                            accessor="amount"
                            backgroundColor="transparent"
                            paddingLeft="15"
                            absolute
                        />
                        <View style={styles.totalContainer}>
                            <Text style={styles.totalLabel}>Total Expenses</Text>
                            <Text style={styles.totalAmount}>₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                        </View>
                    </>
                ) : (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="pie-chart" size={48} color="#666" />
                        <Text style={styles.emptyStateText}>Select a date range to view expense analysis</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#171223',
        padding: 16,
    },
    header: {
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#999999',
    },
    datePickerContainer: {
        marginBottom: 24,
    },
    dateRangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dateButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#262336',
        padding: 12,
        borderRadius: 12,
        gap: 8,
    },
    dateText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    dateRangeDivider: {
        paddingHorizontal: 12,
    },
    dividerText: {
        color: '#666666',
        fontSize: 16,
    },
    analyzeButton: {
        backgroundColor: '#0ac7b8',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    analyzeButtonDisabled: {
        opacity: 0.6,
    },
    analyzeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    chartContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    totalContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 16,
        color: '#999999',
        marginBottom: 4,
    },
    totalAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    emptyState: {
        alignItems: 'center',
        gap: 12,
    },
    emptyStateText: {
        color: '#666666',
        fontSize: 16,
        textAlign: 'center',
    },
});

export default CustomDate;