import React, { useState, useEffect, useCallback } from 'react';
import {
    ChartBarIcon,
    CurrencyDollarIcon,
    UserGroupIcon,
    StarIcon,
    ClockIcon,
    ArrowTrendingUpIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import apiClient from '../../../api/apiClient.js';
import { toast } from 'react-toastify';

const ProfileStatsSection = ({
    doctorId,
    isEditable = false // Stats are read-only
}) => {
    const [statsData, setStatsData] = useState(null);
    const [earningsData, setEarningsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const [refreshing, setRefreshing] = useState(false);

    // Fetch statistics data
    const fetchStats = useCallback(async (period = 'month') => {
        try {
            setLoading(true);
            setError(null);

            const [statsResponse, earningsResponse] = await Promise.all([
                apiClient.get(`/doctors/${doctorId}/stats?period=${period}`),
                apiClient.get(`/doctors/${doctorId}/earnings?period=${period}`)
            ]);

            setStatsData(statsResponse.data.data);
            setEarningsData(earningsResponse.data.data);
        } catch (err) {
            console.error('Error fetching stats:', err);
            setError(err.response?.data?.message || 'Failed to load statistics');

            // Set placeholder data for unavailable statistics
            setStatsData({
                appointmentStats: [],
                ratingStats: { average: 0, totalReviews: 0 },
                consultationTypeStats: [],
                totalPatients: 0,
                period
            });
            setEarningsData({
                earnings: { totalEarnings: 0, thisMonth: 0, platformFee: 0 },
                earningsTrend: [],
                period: { start: new Date(), end: new Date() }
            });
        } finally {
            setLoading(false);
        }
    }, [doctorId]);

    // Refresh data
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchStats(selectedPeriod);
        setRefreshing(false);
        toast.success('Statistics refreshed successfully');
    }, [fetchStats, selectedPeriod]);

    // Handle period change
    const handlePeriodChange = useCallback(async (newPeriod) => {
        setSelectedPeriod(newPeriod);
        await fetchStats(newPeriod);
    }, [fetchStats]);

    // Initial data fetch
    useEffect(() => {
        fetchStats(selectedPeriod);
    }, [fetchStats, selectedPeriod]);

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    // Format percentage
    const formatPercentage = (value) => {
        return `${(value || 0).toFixed(1)}%`;
    };

    // Get appointment stats summary
    const getAppointmentSummary = () => {
        if (!statsData?.appointmentStats) return { total: 0, completed: 0, cancelled: 0 };

        const summary = statsData.appointmentStats.reduce((acc, stat) => {
            acc.total += stat.count;
            if (stat._id === 'completed') acc.completed = stat.count;
            if (stat._id === 'cancelled') acc.cancelled = stat.count;
            return acc;
        }, { total: 0, completed: 0, cancelled: 0 });

        return summary;
    };

    // Get consultation type breakdown
    const getConsultationBreakdown = () => {
        if (!statsData?.consultationTypeStats) return [];

        return statsData.consultationTypeStats.map(stat => ({
            type: stat._id,
            count: stat.count,
            percentage: statsData.appointmentStats.length > 0
                ? (stat.count / getAppointmentSummary().completed * 100)
                : 0
        }));
    };

    // Render loading state
    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <ChartBarIcon className="h-5 w-5 mr-2 text-blue-600" />
                        Profile Statistics & Earnings
                    </h3>
                </div>

                <div className="animate-pulse space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-gray-100 rounded-lg h-24"></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-100 rounded-lg h-48"></div>
                        <div className="bg-gray-100 rounded-lg h-48"></div>
                    </div>
                </div>
            </div>
        );
    }

    const appointmentSummary = getAppointmentSummary();
    const consultationBreakdown = getConsultationBreakdown();
    const completionRate = appointmentSummary.total > 0
        ? (appointmentSummary.completed / appointmentSummary.total * 100)
        : 0;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <ChartBarIcon className="h-5 w-5 mr-2 text-blue-600" />
                    Profile Statistics & Earnings
                </h3>

                <div className="flex items-center space-x-3">
                    {/* Period Selector */}
                    <select
                        value={selectedPeriod}
                        onChange={(e) => handlePeriodChange(e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                    </select>

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                        title="Refresh statistics"
                    >
                        <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                        <p className="text-sm text-yellow-800">
                            {error}. Showing placeholder data below.
                        </p>
                    </div>
                </div>
            )}

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Total Consultations */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-600">Total Consultations</p>
                            <p className="text-2xl font-bold text-blue-900">
                                {appointmentSummary.total || 0}
                            </p>
                        </div>
                        <UserGroupIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="mt-2">
                        <span className="text-xs text-blue-600">
                            {appointmentSummary.completed || 0} completed
                        </span>
                    </div>
                </div>

                {/* Completion Rate */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-600">Completion Rate</p>
                            <p className="text-2xl font-bold text-green-900">
                                {formatPercentage(completionRate)}
                            </p>
                        </div>
                        <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="mt-2">
                        <span className="text-xs text-green-600">
                            {appointmentSummary.cancelled || 0} cancelled
                        </span>
                    </div>
                </div>

                {/* Average Rating */}
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-yellow-600">Average Rating</p>
                            <div className="flex items-center">
                                <p className="text-2xl font-bold text-yellow-900 mr-2">
                                    {(statsData?.ratingStats?.average || 0).toFixed(1)}
                                </p>
                                <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                        <StarIconSolid
                                            key={i}
                                            className={`h-4 w-4 ${i < Math.floor(statsData?.ratingStats?.average || 0)
                                                    ? 'text-yellow-400'
                                                    : 'text-gray-300'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <StarIcon className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div className="mt-2">
                        <span className="text-xs text-yellow-600">
                            {statsData?.ratingStats?.totalReviews || 0} reviews
                        </span>
                    </div>
                </div>

                {/* Total Earnings */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-purple-600">Total Earnings</p>
                            <p className="text-2xl font-bold text-purple-900">
                                {formatCurrency(earningsData?.earnings?.totalEarnings)}
                            </p>
                        </div>
                        <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="mt-2">
                        <span className="text-xs text-purple-600">
                            This period: {formatCurrency(earningsData?.earnings?.thisMonth)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Detailed Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Consultation Types Breakdown */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                        <ClockIcon className="h-4 w-4 mr-2 text-gray-600" />
                        Consultation Types
                    </h4>

                    {consultationBreakdown.length > 0 ? (
                        <div className="space-y-3">
                            {consultationBreakdown.map((item, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-3"></div>
                                        <span className="text-sm font-medium text-gray-700 capitalize">
                                            {item.type}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-semibold text-gray-900">
                                            {item.count}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-2">
                                            ({formatPercentage(item.percentage)})
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                                No consultation data available for this period
                            </p>
                        </div>
                    )}
                </div>

                {/* Earnings Breakdown */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                        <CurrencyDollarIcon className="h-4 w-4 mr-2 text-gray-600" />
                        Earnings Breakdown
                    </h4>

                    {earningsData?.earnings ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Gross Earnings</span>
                                <span className="text-sm font-semibold text-gray-900">
                                    {formatCurrency(earningsData.earnings.totalEarnings)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Platform Fee</span>
                                <span className="text-sm font-semibold text-red-600">
                                    -{formatCurrency(earningsData.earnings.platformFee || 0)}
                                </span>
                            </div>

                            <div className="border-t border-gray-200 pt-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900">Net Earnings</span>
                                    <span className="text-sm font-bold text-green-600">
                                        {formatCurrency(
                                            (earningsData.earnings.totalEarnings || 0) -
                                            (earningsData.earnings.platformFee || 0)
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Total Patients</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {statsData?.totalPatients || 0}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-sm text-gray-600">Avg. per Patient</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {formatCurrency(
                                            (statsData?.totalPatients || 0) > 0
                                                ? (earningsData.earnings.totalEarnings || 0) / statsData.totalPatients
                                                : 0
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <CurrencyRupeeIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                                No earnings data available for this period
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Monthly Trend (if available) */}
            {earningsData?.earningsTrend && earningsData.earningsTrend.length > 0 && (
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                        <ArrowTrendingUpIcon className="h-4 w-4 mr-2 text-gray-600" />
                        Monthly Earnings Trend
                    </h4>

                    <div className="space-y-2">
                        {earningsData.earningsTrend.map((trend, index) => (
                            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                                <span className="text-sm text-gray-600">
                                    {new Date(trend._id.year, trend._id.month - 1).toLocaleDateString('en-US', {
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>
                                <div className="text-right">
                                    <span className="text-sm font-semibold text-gray-900">
                                        {formatCurrency(trend.totalEarnings)}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-2">
                                        ({trend.totalConsultations} consultations)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileStatsSection;