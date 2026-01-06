import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	// 获取时间范围参数
	const timeRange = url.searchParams.get('range') || '24h';
	
	// 只返回基本参数，不在服务器端加载数据
	// 数据将在客户端通过 Statistics API 加载
	return {
		timeRange
	};
};