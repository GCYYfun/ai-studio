/**
 * Dashboard types
 */

export interface APIStats {
    totalRequests: number;
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
    timestamp: Date;
}

export interface DashboardData {
    overview: {
        totalRequests: number;
        activeUsers: number;
        systemHealth: 'healthy' | 'warning' | 'critical';
        uptime: number;
    };

    metrics: {
        requestsOverTime: TimeSeriesData[];
        responseTimeDistribution: DistributionData[];
        errorsByType: CategoryData[];
        geographicDistribution: GeoData[];
    };

    alerts: Alert[];
    lastUpdated: Date;
}

export interface TimeSeriesData {
    timestamp: Date;
    value: number;
    label?: string;
}

export interface DistributionData {
    range: string;
    count: number;
    percentage: number;
}

export interface CategoryData {
    category: string;
    count: number;
    percentage: number;
}

export interface GeoData {
    country: string;
    requests: number;
    coordinates: [number, number];
}

export interface Alert {
    id: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: Date;
    acknowledged: boolean;
}

export interface MetricData {
    label: string;
    value: number;
    change?: number;
    trend?: 'up' | 'down' | 'stable';
}
