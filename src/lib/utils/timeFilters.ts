// 时间筛选工具函数

export interface TimeRange {
	start: Date;
	end: Date;
}

export interface TimeSeriesDataPoint {
	timestamp: Date;
	value: number;
	label?: string;
}

/**
 * 根据时间范围字符串获取时间范围对象
 * 注意：返回UTC时间，因为后台使用UTC时间存储数据
 */
export function getTimeRangeFromString(range: string): TimeRange {
	// 获取当前UTC时间
	const nowUTC = new Date();
	const end = new Date(nowUTC);
	let start: Date;
	
	switch (range) {
		case '1h':
			start = new Date(nowUTC.getTime() - 60 * 60 * 1000);
			break;
		case '6h':
			start = new Date(nowUTC.getTime() - 6 * 60 * 60 * 1000);
			break;
		case '24h':
			start = new Date(nowUTC.getTime() - 24 * 60 * 60 * 1000);
			break;
		case '7d':
			start = new Date(nowUTC.getTime() - 7 * 24 * 60 * 60 * 1000);
			break;
		case '30d':
			start = new Date(nowUTC.getTime() - 30 * 24 * 60 * 60 * 1000);
			break;
		case '90d':
			start = new Date(nowUTC.getTime() - 90 * 24 * 60 * 60 * 1000);
			break;
		default:
			// 默认使用很宽的时间范围，确保能获取到所有历史数据
			// 从2024年开始到现在，涵盖所有可能的数据
			start = new Date('2024-01-01T00:00:00.000Z');
	}
	
	return { start, end };
}

/**
 * 将本地时间转换为UTC时间范围
 * 用于自定义日期范围选择器
 */
export function convertLocalToUTC(localTimeRange: TimeRange): TimeRange {
	return {
		start: new Date(localTimeRange.start.getTime()),
		end: new Date(localTimeRange.end.getTime())
	};
}

/**
 * 获取更宽泛的时间范围，用于确保能获取到数据
 * 当API返回空数据时，可以尝试使用更宽的时间范围
 */
export function getWideTimeRange(): TimeRange {
	const end = new Date();
	// 从一年前开始，确保能覆盖所有可能的历史数据
	const start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
	
	return { start, end };
}

/**
 * 筛选时间序列数据
 */
export function filterTimeSeriesData(
	data: TimeSeriesDataPoint[],
	timeRange: TimeRange
): TimeSeriesDataPoint[] {
	return data.filter(point => 
		point.timestamp >= timeRange.start && point.timestamp <= timeRange.end
	);
}

/**
 * 按时间间隔聚合数据
 */
export function aggregateDataByInterval(
	data: TimeSeriesDataPoint[],
	intervalMinutes: number
): TimeSeriesDataPoint[] {
	if (data.length === 0) return [];
	
	const intervalMs = intervalMinutes * 60 * 1000;
	const aggregated: { [key: number]: { sum: number; count: number; timestamp: Date } } = {};
	
	data.forEach(point => {
		// 将时间戳对齐到间隔边界
		const intervalStart = Math.floor(point.timestamp.getTime() / intervalMs) * intervalMs;
		
		if (!aggregated[intervalStart]) {
			aggregated[intervalStart] = {
				sum: 0,
				count: 0,
				timestamp: new Date(intervalStart)
			};
		}
		
		aggregated[intervalStart].sum += point.value;
		aggregated[intervalStart].count += 1;
	});
	
	return Object.values(aggregated)
		.map(agg => ({
			timestamp: agg.timestamp,
			value: agg.sum / agg.count, // 平均值
			label: agg.timestamp.toLocaleTimeString('zh-CN', { 
				hour: '2-digit', 
				minute: '2-digit' 
			})
		}))
		.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * 根据时间范围自动选择合适的聚合间隔
 */
export function getOptimalInterval(timeRange: TimeRange): number {
	const durationMs = timeRange.end.getTime() - timeRange.start.getTime();
	const durationHours = durationMs / (60 * 60 * 1000);
	
	if (durationHours <= 1) {
		return 1; // 1分钟间隔
	} else if (durationHours <= 6) {
		return 5; // 5分钟间隔
	} else if (durationHours <= 24) {
		return 30; // 30分钟间隔
	} else if (durationHours <= 168) { // 7天
		return 60 * 2; // 2小时间隔
	} else {
		return 60 * 24; // 1天间隔
	}
}

/**
 * 生成时间标签
 */
export function generateTimeLabels(timeRange: TimeRange, intervalMinutes: number): string[] {
	const labels: string[] = [];
	const intervalMs = intervalMinutes * 60 * 1000;
	
	let current = new Date(timeRange.start);
	// 对齐到间隔边界
	current = new Date(Math.ceil(current.getTime() / intervalMs) * intervalMs);
	
	while (current <= timeRange.end) {
		if (intervalMinutes < 60) {
			// 小于1小时，显示时:分
			labels.push(current.toLocaleTimeString('zh-CN', { 
				hour: '2-digit', 
				minute: '2-digit' 
			}));
		} else if (intervalMinutes < 60 * 24) {
			// 小于1天，显示月/日 时:分
			labels.push(current.toLocaleString('zh-CN', { 
				month: 'numeric',
				day: 'numeric',
				hour: '2-digit', 
				minute: '2-digit' 
			}));
		} else {
			// 1天或以上，显示月/日
			labels.push(current.toLocaleDateString('zh-CN', { 
				month: 'numeric',
				day: 'numeric'
			}));
		}
		
		current = new Date(current.getTime() + intervalMs);
	}
	
	return labels;
}

/**
 * 格式化时间范围显示文本
 */
export function formatTimeRangeText(timeRange: TimeRange): string {
	const start = timeRange.start.toLocaleString('zh-CN');
	const end = timeRange.end.toLocaleString('zh-CN');
	return `${start} - ${end}`;
}

/**
 * 检查时间范围是否有效
 */
export function isValidTimeRange(timeRange: TimeRange): boolean {
	return timeRange.start < timeRange.end && 
		   timeRange.start <= new Date() && 
		   timeRange.end <= new Date();
}