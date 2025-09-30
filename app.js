// Konfigurasi
const CONFIG = {
    MONTHLY_TARGET: 450,
    DAILY_TARGET: 15,
    SOURCES: ['Ava', 'Skip STTC', 'ROA Gather']
};

// Data Manager
const dataManager = {
    incomeData: JSON.parse(localStorage.getItem('incomeData')) || [],
    
    saveData() {
        localStorage.setItem('incomeData', JSON.stringify(this.incomeData));
    },
    
    addData(newData) {
        const existingIndex = this.incomeData.findIndex(item => item.date === newData.date);
        if (existingIndex > -1) {
            if (confirm('Data untuk tanggal ini sudah ada. Update data?')) {
                this.incomeData[existingIndex] = newData;
            } else {
                return false;
            }
        } else {
            this.incomeData.push(newData);
        }
        
        this.incomeData.sort((a, b) => new Date(a.date) - new Date(b.date));
        this.saveData();
        return true;
    },
    
    deleteData(date) {
        this.incomeData = this.incomeData.filter(item => item.date !== date);
        this.saveData();
    },
    
    getDataByDateRange(startDate, endDate) {
        if (!startDate || !endDate) return this.incomeData;
        return this.incomeData.filter(item => item.date >= startDate && item.date <= endDate);
    },
    
    getTodayData() {
        const today = new Date().toISOString().split('T')[0];
        return this.incomeData.find(item => item.date === today);
    },
    
    getDataByPeriod(days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return this.incomeData.filter(item => new Date(item.date) >= startDate);
    }
};

// Form Manager
const formManager = {
    init() {
        document.getElementById('incomeForm').addEventListener('submit', (e) => this.handleSubmit(e));
        this.initializeDates();
    },
    
    initializeDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('inputDate').value = today;
        
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        document.getElementById('startDate').value = startOfMonth.toISOString().split('T')[0];
        document.getElementById('endDate').value = today;
    },
    
    handleSubmit(e) {
        e.preventDefault();
        
        const newData = {
            date: document.getElementById('inputDate').value,
            ava: parseFloat(document.getElementById('inputAva').value),
            skip: parseFloat(document.getElementById('inputSkip').value),
            roa: parseFloat(document.getElementById('inputROA').value),
            notes: document.getElementById('inputNotes').value,
            total: function() {
                return this.ava + this.skip + this.roa;
            }
        };
        
        if (dataManager.addData(newData)) {
            this.resetForm();
            tableManager.renderTable();
            dashboardManager.updateDashboard();
            chartManager.renderChart();
        }
    },
    
    resetForm() {
        document.getElementById('incomeForm').reset();
        this.initializeDates();
    },
    
    populateForm(date) {
        const data = dataManager.incomeData.find(item => item.date === date);
        if (data) {
            document.getElementById('inputDate').value = data.date;
            document.getElementById('inputAva').value = data.ava;
            document.getElementById('inputSkip').value = data.skip;
            document.getElementById('inputROA').value = data.roa;
            document.getElementById('inputNotes').value = data.notes || '';
            
            dataManager.deleteData(date);
            document.getElementById('incomeForm').scrollIntoView();
        }
    }
};

// Table Manager
const tableManager = {
    renderTable() {
        const tableBody = document.getElementById('incomeTable');
        const filteredData = filterManager.getFilteredData();
        
        if (filteredData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada data</td></tr>';
            return;
        }
        
        tableBody.innerHTML = filteredData.map(item => `
            <tr>
                <td>${this.formatDate(item.date)}</td>
                <td>${item.ava}M</td>
                <td>${item.skip}M</td>
                <td>${item.roa}M</td>
                <td><strong>${item.total()}M</strong></td>
                <td>${item.notes || '-'}</td>
                <td>${this.getStatusBadge(item.total())}</td>
                <td>
                    <button class="btn btn-sm btn-warning me-1" onclick="formManager.populateForm('${item.date}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="tableManager.deleteData('${item.date}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },
    
    getStatusBadge(total) {
        const diff = total - CONFIG.DAILY_TARGET;
        if (diff > 0) {
            return `<span class="badge bg-success">+${diff.toFixed(1)}M</span>`;
        } else if (diff < 0) {
            return `<span class="badge bg-danger">${diff.toFixed(1)}M</span>`;
        } else {
            return `<span class="badge bg-secondary">Tepat</span>`;
        }
    },
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },
    
    deleteData(date) {
        if (confirm(`Hapus data untuk tanggal ${this.formatDate(date)}?`)) {
            dataManager.deleteData(date);
            this.renderTable();
            dashboardManager.updateDashboard();
            chartManager.renderChart();
        }
    }
};

// Dashboard Manager
const dashboardManager = {
    updateDashboard() {
        this.updateTodayStats();
        this.updateWeekStats();
        this.updateMonthStats();
        this.updateMonthlyProgress();
    },
    
    updateTodayStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayData = dataManager.getTodayData();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayData = dataManager.incomeData.find(item => item.date === yesterday.toISOString().split('T')[0]);
        
        const todayIncome = todayData ? todayData.total() : 0;
        const yesterdayIncome = yesterdayData ? yesterdayData.total() : 0;
        
        document.getElementById('todayIncome').textContent = `${todayIncome}M`;
        document.getElementById('todayComparison').innerHTML = 
            this.getComparisonText(todayIncome, yesterdayIncome, 'kemarin');
    },
    
    updateWeekStats() {
        const weekData = dataManager.getDataByPeriod(7);
        const previousWeekData = dataManager.getDataByPeriod(14).filter(item => {
            const itemDate = new Date(item.date);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return itemDate < oneWeekAgo;
        });
        
        const weekIncome = weekData.reduce((sum, item) => sum + item.total(), 0);
        const prevWeekIncome = previousWeekData.reduce((sum, item) => sum + item.total(), 0);
        
        document.getElementById('weekIncome').textContent = `${weekIncome.toFixed(1)}M`;
        document.getElementById('weekComparison').innerHTML = 
            this.getComparisonText(weekIncome, prevWeekIncome, 'minggu lalu');
    },
    
    updateMonthStats() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const currentMonthData = dataManager.incomeData.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
        });
        
        const monthIncome = currentMonthData.reduce((sum, item) => sum + item.total(), 0);
        const averageIncome = currentMonthData.length > 0 ? monthIncome / currentMonthData.length : 0;
        
        document.getElementById('monthIncome').textContent = `${monthIncome.toFixed(1)}M`;
        document.getElementById('averageIncome').textContent = `${averageIncome.toFixed(1)}M`;
    },
    
    updateMonthlyProgress() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthData = dataManager.incomeData.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
        });
        
        const monthIncome = monthData.reduce((sum, item) => sum + item.total(), 0);
        const progress = (monthIncome / CONFIG.MONTHLY_TARGET) * 100;
        
        document.getElementById('monthlyProgress').textContent = `${monthIncome.toFixed(1)}/${CONFIG.MONTHLY_TARGET}M`;
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${progress.toFixed(1)}% Tercapai`;
        
        this.updateProgressBarColor(progress);
    },
    
    updateProgressBarColor(progress) {
        const progressBar = document.getElementById('progressBar');
        if (progress >= 100) {
            progressBar.className = 'progress-bar bg-success';
        } else if (progress >= 75) {
            progressBar.className = 'progress-bar bg-info';
        } else if (progress >= 50) {
            progressBar.className = 'progress-bar bg-warning';
        } else {
            progressBar.className = 'progress-bar bg-danger';
        }
    },
    
    getComparisonText(current, previous, period) {
        if (previous === 0) return `Tidak ada data ${period}`;
        
        const diff = current - previous;
        const percentage = ((diff / previous) * 100).toFixed(1);
        
        if (diff > 0) {
            return `<span class="positive">+${diff.toFixed(1)}M (${percentage}%)</span> dari ${period}`;
        } else if (diff < 0) {
            return `<span class="negative">${diff.toFixed(1)}M (${percentage}%)</span> dari ${period}`;
        } else {
            return `<span class="neutral">Sama dengan ${period}</span>`;
        }
    }
};

// Chart Manager
const chartManager = {
    chart: null,
    
    renderChart() {
        const ctx = document.getElementById('incomeChart').getContext('2d');
        const last7Days = this.getLast7Days();
        
        const chartData = last7Days.map(date => {
            const data = dataManager.incomeData.find(item => item.date === date);
            return data ? data.total() : 0;
        });
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: last7Days.map(date => tableManager.formatDate(date)),
                datasets: [{
                    label: 'Pendapatan Harian (M)',
                    data: chartData,
                    backgroundColor: chartData.map(value => 
                        value > CONFIG.DAILY_TARGET ? '#28a745' : 
                        value < CONFIG.DAILY_TARGET ? '#dc3545' : '#ffc107'
                    ),
                    borderColor: '#343a40',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Pendapatan (M)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Tanggal'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Pendapatan: ${context.parsed.y}M`;
                            }
                        }
                    }
                }
            }
        });
    },
    
    getLast7Days() {
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    }
};

// Filter Manager
const filterManager = {
    getFilteredData() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        return dataManager.getDataByDateRange(startDate, endDate);
    },
    
    applyFilter() {
        tableManager.renderTable();
        chartManager.renderChart();
    },
    
    resetFilter() {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        tableManager.renderTable();
        chartManager.renderChart();
    }
};

// Export Manager
const exportManager = {
    exportToExcel() {
        let csv = 'Tanggal,Ava (M),Skip STTC (M),ROA Gather (M),Total (M),Catatan,Status\n';
        
        dataManager.incomeData.forEach(item => {
            const status = item.total() > CONFIG.DAILY_TARGET ? 'Above Target' : 
                          item.total() < CONFIG.DAILY_TARGET ? 'Below Target' : 'On Target';
            csv += `"${tableManager.formatDate(item.date)}",${item.ava},${item.skip},${item.roa},${item.total()},"${item.notes || ''}","${status}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pendapatan_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    formManager.init();
    tableManager.renderTable();
    dashboardManager.updateDashboard();
    chartManager.renderChart();
});