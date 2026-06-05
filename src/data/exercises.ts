import type { Exercise } from '../types';

export const presetExercises: Exercise[] = [
  // Warmup
  { name: '泡沫轴全身放松', category: 'warmup', equipment: ['other'], targetMuscles: ['全身'], description: '使用泡沫轴滚动放松全身主要肌群', volleyballRelevance: 'medium', prehabBenefit: ['general'] },
  { name: '动态拉伸', category: 'warmup', equipment: ['bodyweight'], targetMuscles: ['全身'], description: '腿摆动、髋关节环绕、手臂绕圈、侧弓步', volleyballRelevance: 'medium', prehabBenefit: ['general'] },
  { name: '臀桥激活', category: 'warmup', equipment: ['bodyweight'], targetMuscles: ['臀大肌'], description: '仰卧臀桥，激活臀部肌群', volleyballRelevance: 'high' },

  // Prehab
  { name: '弹力带 YTWL', category: 'prehab', equipment: ['band'], targetMuscles: ['肩袖肌群', '斜方肌'], description: '弹力带做Y-T-W-L四个方向练习，预防扣球肩', volleyballRelevance: 'high', prehabBenefit: ['shoulder'] },
  { name: '弹力带肩袖外旋', category: 'prehab', equipment: ['band'], targetMuscles: ['肩袖肌群'], description: '肘关节夹紧身体，做肩外旋', volleyballRelevance: 'high', prehabBenefit: ['shoulder'] },
  { name: '单腿平衡站立', category: 'prehab', equipment: ['bodyweight'], targetMuscles: ['踝关节'], description: '单腿站立保持平衡，闭眼增加难度', volleyballRelevance: 'high', prehabBenefit: ['ankle'] },
  { name: '落地缓冲练习', category: 'prehab', equipment: ['box'], targetMuscles: ['下肢'], description: '从30cm箱上跳下，软着陆控制', volleyballRelevance: 'high', prehabBenefit: ['knee', 'ankle'], injuryRisk: ['knee'] },
  { name: '北欧弯举辅助', category: 'prehab', equipment: ['bodyweight'], targetMuscles: ['腘绳肌'], description: '跪姿控制身体缓慢前倾，腘绳肌离心', volleyballRelevance: 'high', prehabBenefit: ['knee'] },
  { name: '踝关节ABC书写', category: 'prehab', equipment: ['bodyweight'], targetMuscles: ['踝关节'], description: '坐姿抬腿，用脚尖在空中写A-B-C', volleyballRelevance: 'medium', prehabBenefit: ['ankle'] },

  // Strength
  { name: '杠铃深蹲', category: 'strength', equipment: ['barbell'], targetMuscles: ['股四头肌', '臀大肌'], description: '杠铃后深蹲，核心稳定，下蹲至大腿与地面平行', volleyballRelevance: 'high', injuryRisk: ['knee', 'back'] },
  { name: '罗马尼亚硬拉', category: 'strength', equipment: ['barbell'], targetMuscles: ['腘绳肌', '臀大肌', '下背'], description: '保持背部平直，臀部后推，杠铃沿腿部下滑', volleyballRelevance: 'high', prehabBenefit: ['back'] },
  { name: '保加利亚分腿蹲', category: 'strength', equipment: ['dumbbell', 'bodyweight'], targetMuscles: ['股四头肌', '臀大肌'], description: '后脚抬高，单腿下蹲，模拟起跳发力', volleyballRelevance: 'high' },
  { name: '北欧弯举', category: 'strength', equipment: ['bodyweight'], targetMuscles: ['腘绳肌'], description: '跪姿控制身体前倾，腘绳肌离心收缩', volleyballRelevance: 'high', prehabBenefit: ['knee'] },
  { name: '农夫行走', category: 'strength', equipment: ['dumbbell', 'kettlebell'], targetMuscles: ['核心', '握力'], description: '双手持重物行走，保持躯干稳定', volleyballRelevance: 'medium' },
  { name: '核心抗旋转 Pallof Press', category: 'strength', equipment: ['band', 'cable'], targetMuscles: ['核心'], description: '弹力带或龙门架侧向推拉，对抗旋转', volleyballRelevance: 'high', prehabBenefit: ['back'] },

  // Power
  { name: '悬垂高翻', category: 'power', equipment: ['barbell'], targetMuscles: ['全身爆发力'], description: '从悬垂位置发力高翻，三关节伸展', volleyballRelevance: 'high', injuryRisk: ['wrist', 'shoulder'] },
  { name: '跳蹲', category: 'power', equipment: ['barbell'], targetMuscles: ['下肢爆发力'], description: '杠铃负重深蹲后爆发跳起', volleyballRelevance: 'high', injuryRisk: ['knee'] },
  { name: '药球下砸+上抛', category: 'power', equipment: ['medball'], targetMuscles: ['全身爆发力'], description: '药球举过头顶猛力下砸，再接反弹上抛', volleyballRelevance: 'high' },

  // Plyometric
  { name: '箱跳', category: 'plyometric', equipment: ['box'], targetMuscles: ['下肢爆发力'], description: '双脚跳上箱，软着陆', volleyballRelevance: 'high', injuryRisk: ['knee'] },
  { name: '深度跳跃 Depth Jump', category: 'plyometric', equipment: ['box'], targetMuscles: ['下肢爆发力'], description: '从箱上落下后立即最大努力起跳', volleyballRelevance: 'high', injuryRisk: ['knee', 'ankle'] },
  { name: '连续障碍跳跃', category: 'plyometric', equipment: ['other'], targetMuscles: ['下肢爆发力'], description: '连续跳过多个低障碍物', volleyballRelevance: 'high', injuryRisk: ['knee', 'ankle'] },
  { name: '单腿跳箱', category: 'plyometric', equipment: ['box'], targetMuscles: ['下肢单侧爆发力'], description: '单腿跳上低箱，模拟起跳', volleyballRelevance: 'high', injuryRisk: ['knee', 'ankle'] },

  // Volleyball
  { name: '助跑摸高训练', category: 'volleyball', equipment: ['bodyweight'], targetMuscles: ['全身'], description: '三步助跑全力起跳摸高', volleyballRelevance: 'high', injuryRisk: ['knee'] },
  { name: '连续起跳拦网', category: 'volleyball', equipment: ['bodyweight'], targetMuscles: ['下肢'], description: '网前连续起跳拦网模拟', volleyballRelevance: 'high', injuryRisk: ['knee'] },
  { name: '步法移动训练', category: 'volleyball', equipment: ['bodyweight'], targetMuscles: ['下肢'], description: '前后左右快速移动，重心控制', volleyballRelevance: 'high' },
  { name: '发球练习', category: 'volleyball', equipment: ['bodyweight'], targetMuscles: ['肩'], description: '注重技术稳定性练习发球', volleyballRelevance: 'high', injuryRisk: ['shoulder'] },

  // Mobility
  { name: '90/90 髋关节拉伸', category: 'mobility', equipment: ['bodyweight'], targetMuscles: ['髋关节'], description: '坐姿90/90度，前倾保持', volleyballRelevance: 'high', prehabBenefit: ['hip'] },
  { name: '猫牛式', category: 'mobility', equipment: ['bodyweight'], targetMuscles: ['脊柱'], description: '四足跪姿，弓背-凹背交替', volleyballRelevance: 'medium', prehabBenefit: ['back'] },
  { name: '托马斯测试拉伸', category: 'mobility', equipment: ['bodyweight'], targetMuscles: ['髋屈肌'], description: '仰卧抱单膝，另一腿自然下垂拉伸', volleyballRelevance: 'high', prehabBenefit: ['hip'] },

  // Recovery
  { name: '静态拉伸', category: 'recovery', equipment: ['bodyweight'], targetMuscles: ['全身'], description: '训练后全身主要肌群静态拉伸', volleyballRelevance: 'medium' },
  { name: '泡沫轴放松', category: 'recovery', equipment: ['other'], targetMuscles: ['全身'], description: '泡沫轴放松股四头肌、腘绳肌、背部等', volleyballRelevance: 'medium' },
];
