// Konfigurasi
const CONFIG = {
    MONTHLY_TARGET: 450,
    DAILY_TARGET: 15
};

// Data storage
let incomeData = JSON.parse(localStorage.getItem('incomeData')) || [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeDates();
    renderTable();
    updateDashboard();
    renderChart();
    
    // Tambah tombol Backup/Restore
    addBackupButtons();
    
    // Form handler
    document.getElementById('incomeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newData = {
            date: document.getElementById('inputDate').value,
            ava: parseFloat(document.getElementById('inputAva').value),
            skip: parseFloat(document.getElementById('inputSkip').value),
            roa: parseFloat(document.getElementById('inputROA').value),
            notes: document.getElementById('inputNotes').value
        };
        
        // Add total function
        newData.total = function() {
            return this.ava + this.skip + this.roa;
        };
        
        // Check if date already exists
        const existingIndex = incomeData.findIndex(item => item.date === newData.date);
        if (existingIndex > -1) {
            if (confirm('Data untuk tanggal ini sudah ada. Update data?')) {
                incomeData[existingIndex] = newData;
            } else {
                return;
            }
        } else {
            incomeData.push(newData);
        }
        
        // Sort data by date
        incomeData.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        saveData();
        renderTable();
        updateDashboard();
        renderChart();
        this.reset();
        initializeDates();
        
        alert('✅ Data tersimpan! Jangan lupa EXPORT kalau ganti device!');
    });
});

// Tambahkan tombol Backup/Restore
function addBackupButtons() {
    const tableHeader = document.querySelector('.card-header');
    if (tableHeader && !tableHeader.querySelector('.btn-group')) {
        tableHeader.innerHTML += `
            <div class="btn-group float-end">
                <button class="btn btn-sm btn-success" onclick="exportToJSON()">
                    <i class="fas fa-file-export me-1"></i>Export
                </button>
                <button class="btn btn-sm btn-info" onclick="importFromFile()">
                    <i class="fas fa-file-import me-1"></i>Import
                </button>
                <button class="btn btn-sm btn-warning" onclick="showBackupInfo()">
                    <i class="fas fa-info-circle me-1"></i>Info
                </button>
            </div>
        `;
    }
}

// Initialize dates
function initializeDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('inputDate').value = today;
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    document.getElementById('startDate').value = startOfMonth.toISOString().split('T')[0];
    document.getElementById('endDate').value = today;
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('incomeData', JSON.stringify(incomeData));
}

// Render table
function renderTable() {
    const tableBody = document.getElementById('incomeTable');
    const filteredData = getFilteredData();
    
    if (filteredData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada data</td></tr>';
        return;
    }
    
    tableBody.innerHTML = filteredData.map(item => `
        <tr>
            <td>${formatDate(item.date)}</td>
            <td>${item.ava}M</td>
            <td>${item.skip}M</td>
            <td>${item.roa}M</td>
            <td><strong>${item.total()}M</strong></td>
            <td>${item.notes || '-'}</td>
            <td>${getStatusBadge(item.total())}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" onclick="editData('${item.date}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteData('${item.date}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Get status badge
function getStatusBadge(total) {
    const diff = total - CONFIG.DAILY_TARGET;
    if (diff > 0) {
        return `<span class="badge bg-success">+${diff.toFixed(1)}M</span>`;
    } else if (diff < 0) {
        return `<span class="badge bg-danger">${diff.toFixed(1)}M</span>`;
    } else {
        return `<span class="badge bg-secondary">Tepat</span>`;
    }
}

// Update dashboard
function updateDashboard() {
    updateTodayStats();
    updateWeekStats();
    updateMonthStats();
    updateMonthlyProgress();
}

// Today stats
function updateTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayData = incomeData.find(item => item.date === today);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayData = incomeData.find(item => item.date === yesterday.toISOString().split('T')[0]);
    
    const todayIncome = todayData ? todayData.total() : 0;
    const yesterdayIncome = yesterdayData ? yesterdayData.total() : 0;
    
    document.getElementById('todayIncome').textContent = `${todayIncome}M`;
    document.getElementById('todayComparison').innerHTML = getComparisonText(todayIncome, yesterdayIncome, 'kemarin');
}

// Week stats
function updateWeekStats() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const currentWeekData = incomeData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= oneWeekAgo;
    });
    
    const previousWeekData = incomeData.filter(item => {
        const itemDate = new Date(item.date);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        return itemDate >= twoWeeksAgo && itemDate < oneWeekAgo;
    });
    
    const weekIncome = currentWeekData.reduce((sum, item) => sum + item.total(), 0);
    const prevWeekIncome = previousWeekData.reduce((sum, item) => sum + item.total(), 0);
    
    document.getElementById('weekIncome').textContent = `${weekIncome.toFixed(1)}M`;
    document.getElementById('weekComparison').innerHTML = getComparisonText(weekIncome, prevWeekIncome, 'minggu lalu');
}

// Month stats
function updateMonthStats() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthData = incomeData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
    });
    
    const prevMonthData = incomeData.filter(item => {
        const itemDate = new Date(item.date);
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return itemDate.getMonth() === prevMonth && itemDate.getFullYear() === prevYear;
    });
    
    const monthIncome = currentMonthData.reduce((sum, item) => sum + item.total(), 0);
    const prevMonthIncome = prevMonthData.reduce((sum, item) => sum + item.total(), 0);
    const averageIncome = currentMonthData.length > 0 ? monthIncome / currentMonthData.length : 0;
    
    document.getElementById('monthIncome').textContent = `${monthIncome.toFixed(1)}M`;
    document.getElementById('averageIncome').textContent = `${averageIncome.toFixed(1)}M`;
    document.getElementById('monthComparison').innerHTML = getComparisonText(monthIncome, prevMonthIncome, 'bulan lalu');
}

// Monthly progress
function updateMonthlyProgress() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthData = incomeData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
    });
    
    const monthIncome = monthData.reduce((sum, item) => sum + item.total(), 0);
    const progress = (monthIncome / CONFIG.MONTHLY_TARGET) * 100;
    
    document.getElementById('monthlyProgress').textContent = `${monthIncome.toFixed(1)}/${CONFIG.MONTHLY_TARGET}M`;
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `${progress.toFixed(1)}% Tercapai`;
    
    // Progress bar color
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
}

// Get comparison text
function getComparisonText(current, previous, period) {
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

// Render chart
function renderChart() {
    const ctx = document.getElementById('incomeChart').getContext('2d');
    const last7Days = getLast7Days();
    
    const chartData = last7Days.map(date => {
        const data = incomeData.find(item => item.date === date);
        return data ? data.total() : 0;
    });
    
    if (window.incomeChart) {
        window.incomeChart.destroy();
    }
    
    window.incomeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7Days.map(date => formatDate(date)),
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
}

// Get last 7 days
function getLast7Days() {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
}

// Filter data
function getFilteredData() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) return incomeData;
    
    return incomeData.filter(item => {
        return item.date >= startDate && item.date <= endDate;
    });
}

// Apply filter
function applyFilter() {
    renderTable();
    renderChart();
}

// Reset filter
function resetFilter() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    renderTable();
    renderChart();
}

// Edit data
function editData(date) {
    const data = incomeData.find(item => item.date === date);
    if (data) {
        document.getElementById('inputDate').value = data.date;
        document.getElementById('inputAva').value = data.ava;
        document.getElementById('inputSkip').value = data.skip;
        document.getElementById('inputROA').value = data.roa;
        document.getElementById('inputNotes').value = data.notes || '';
        
        // Remove the existing data
        deleteData(date, false);
        
        // Scroll to form
        document.getElementById('incomeForm').scrollIntoView();
    }
}

// Delete data
function deleteData(date, confirm = true) {
    if (!confirm || confirm(`Hapus data untuk tanggal ${formatDate(date)}?`)) {
        incomeData = incomeData.filter(item => item.date !== date);
        saveData();
        renderTable();
        updateDashboard();
        renderChart();
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Export to JSON
function exportToJSON() {
    const dataStr = JSON.stringify(incomeData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-pendapatan-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert('💾 Backup berhasil! Simpan file ini untuk restore data.');
}

// Import from JSON
function importFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (confirm(`Import ${importedData.length} data? Data lama akan ditimpa!`)) {
                    incomeData = importedData;
                    saveData();
                    renderTable();
                    updateDashboard();
                    renderChart();
                    alert('✅ Data berhasil diimport!');
                }
            } catch (error) {
                alert('❌ File tidak valid!');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Show backup info
function showBackupInfo() {
    alert(`📋 CARA SIMPAN DATA:
    
1. **EXPORT** dulu sebelum ganti device
2. Simpan file .json di Google Drive/HP
3. **IMPORT** file tersebut di device baru
4. Data kamu akan muncul kembali!

💡 Tips: Export setiap hari biar aman!`);
}