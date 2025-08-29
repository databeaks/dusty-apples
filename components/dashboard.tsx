// 'use client';

// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { useAppStore } from '@/lib/store/appStore';
// import { dashboardMetrics } from '@/lib/data/sampleData';
// import { 
//   MessageSquare, 
//   FolderOpen, 
//   TrendingUp, 
//   Users, 
//   ArrowUpRight, 
//   ArrowDownRight,
//   Minus,
//   Play,
//   MoreVertical
// } from 'lucide-react';

// const iconMap = {
//   MessageSquare,
//   FolderOpen,
//   TrendingUp,
//   Users,
// };



// export function Dashboard() {
//   const { openGuidedTour } = useAppStore();

//   const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
//     switch (trend) {
//       case 'up':
//         return <ArrowUpRight className="h-4 w-4 text-green-600" />;
//       case 'down':
//         return <ArrowDownRight className="h-4 w-4 text-red-600" />;
//       default:
//         return <Minus className="h-4 w-4 text-gray-400" />;
//     }
//   };

//   const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
//     switch (trend) {
//       case 'up':
//         return 'text-green-600';
//       case 'down':
//         return 'text-red-600';
//       default:
//         return 'text-gray-500';
//     }
//   };

//   return (
//     <div className="flex-1 bg-gray-50 p-6">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="mb-8">
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
//             <div>
//               <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
//               <p className="mt-1 text-sm text-gray-600">
//                 Welcome back! Here's what's happening with your product.
//               </p>
//             </div>
//             <div className="mt-4 sm:mt-0">
//               <Button onClick={openGuidedTour} className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600">
//                 <Play className="h-4 w-4 mr-2" />
//                 Start Setup Tour
//               </Button>
//             </div>
//           </div>
//         </div>

//         {/* Metrics Grid */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//           {dashboardMetrics.map((metric) => {
//             const Icon = iconMap[metric.icon as keyof typeof iconMap];
//             return (
//               <Card key={metric.id} className="bg-white">
//                 <CardContent className="p-6">
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center">
//                       {Icon && <Icon className="h-5 w-5 text-red-600 mr-3" />}
//                       <div>
//                         <p className="text-sm font-medium text-gray-600">{metric.title}</p>
//                         <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
//                       </div>
//                     </div>
//                     <div className="flex items-center space-x-1">
//                       {getTrendIcon(metric.trend)}
//                     </div>
//                   </div>
//                   {metric.change && (
//                     <div className="mt-2">
//                       <span className={`text-sm font-medium ${getTrendColor(metric.trend)}`}>
//                         {metric.change}
//                       </span>
//                       <span className="text-sm text-gray-500 ml-1">vs last month</span>
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>
//             );
//           })}
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Recent Activity */}
//           <Card className="lg:col-span-2 bg-white">
//             <CardHeader>
//               <div className="flex items-center justify-between">
//                 <div>
//                   <CardTitle className="text-lg">Recent Activity</CardTitle>
//                   <CardDescription>Latest updates across your projects</CardDescription>
//                 </div>
//                 <Button variant="ghost" size="sm">
//                   <MoreVertical className="h-4 w-4" />
//                 </Button>
//               </div>
//             </CardHeader>
//             <CardContent>
//               <div className="flex flex-col items-center justify-center py-12 text-center">
//                 <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
//                   <MessageSquare className="h-6 w-6 text-gray-400" />
//                 </div>
//                 <h3 className="text-sm font-medium text-gray-900 mb-2">No recent activity</h3>
//                 <p className="text-xs text-gray-500 mb-4 max-w-sm">
//                   Activity from tour sessions, user interactions, and system events will appear here.
//                 </p>
//                 <Button 
//                   variant="outline" 
//                   size="sm" 
//                   className="text-xs"
//                   onClick={openGuidedTour}
//                 >
//                   Start a Tour Session
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Quick Actions */}
//           <Card className="bg-white">
//             <CardHeader>
//               <CardTitle className="text-lg">Quick Actions</CardTitle>
//               <CardDescription>Common tasks and shortcuts</CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-3">
//               <Button variant="outline" className="w-full justify-start">
//                 <MessageSquare className="h-4 w-4 mr-2" />
//                 Capture Feedback
//               </Button>
//               <Button variant="outline" className="w-full justify-start">
//                 <FolderOpen className="h-4 w-4 mr-2" />
//                 New Project
//               </Button>
//               <Button variant="outline" className="w-full justify-start">
//                 <Users className="h-4 w-4 mr-2" />
//                 Invite Team Member
//               </Button>
//               <Button variant="outline" className="w-full justify-start">
//                 <TrendingUp className="h-4 w-4 mr-2" />
//                 View Analytics
//               </Button>
              
//               <div className="pt-4 border-t border-gray-100">
//                 <Button 
//                   onClick={async () => {
//                     try {
//                       await openGuidedTour();
//                     } catch (error) {
//                       console.error('Failed to start setup tour:', error);
//                     }
//                   }}
//                   className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600"
//                 >
//                   <Play className="h-4 w-4 mr-2" />
//                   Start Setup Tour
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     </div>
//   );
// }