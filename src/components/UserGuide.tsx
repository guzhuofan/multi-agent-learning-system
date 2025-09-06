import React, { useState } from 'react';
import { X, ArrowRight, MessageCircle, GitBranch, Users, Zap } from 'lucide-react';

interface UserGuideProps {
  onClose: () => void;
  onComplete: () => void;
}

const UserGuide: React.FC<UserGuideProps> = ({ onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    {
      title: '欢迎使用多Agent学习系统！',
      content: '这是一个创新的AI对话系统，支持创建多个专门的Agent来处理不同任务。让我们用5分钟时间快速上手！',
      icon: <Users className="w-8 h-8 text-blue-500" />,
      action: '开始引导',
      tip: '💡 每个Agent都有自己的专业领域和对话历史'
    },
    {
      title: '基础对话功能',
      content: '在主界面的输入框中输入消息，按Enter或点击发送按钮与当前Agent对话。试试问一个问题！',
      icon: <MessageCircle className="w-8 h-8 text-green-500" />,
      action: '我知道了',
      tip: '⚡ 快捷键：Ctrl + Enter 快速发送消息'
    },
    {
      title: '创建分支Agent',
      content: '点击消息旁的"创建分支"按钮，可以基于当前对话创建专门的Agent。每个Agent都会继承上下文！',
      icon: <GitBranch className="w-8 h-8 text-purple-500" />,
      action: '明白了',
      tip: '🌟 分支Agent适合深入探讨特定话题'
    },
    {
      title: 'Agent切换与管理',
      content: '使用左侧边栏可以查看所有Agent，点击切换。右侧分支树显示Agent层级关系。',
      icon: <Users className="w-8 h-8 text-orange-500" />,
      action: '学会了',
      tip: '🔄 快捷键：Ctrl + B 切换侧边栏，Ctrl + T 切换分支树'
    },
    {
      title: '高级功能',
      content: '支持消息引用、复制、性能监控等功能。按Ctrl + / 查看所有快捷键！',
      icon: <Zap className="w-8 h-8 text-red-500" />,
      action: '完成引导',
      tip: '🚀 现在你已经掌握了所有核心功能！'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps([...completedSteps, currentStep]);
      setCurrentStep(currentStep + 1);
    } else {
      setCompletedSteps([...completedSteps, currentStep]);
      onComplete();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">快速上手指南</h2>
            <button
              onClick={handleSkip}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* 进度条 */}
          <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-sm mt-2 opacity-90">
            步骤 {currentStep + 1} / {steps.length}
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <div className="flex items-start space-x-4 mb-6">
            <div className="flex-shrink-0">
              {steps[currentStep].icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">
                {steps[currentStep].title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {steps[currentStep].content}
              </p>
            </div>
          </div>

          {/* 提示 */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <p className="text-sm text-blue-700">
              {steps[currentStep].tip}
            </p>
          </div>

          {/* 按钮 */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
            >
              跳过引导
            </button>
            
            <button
              onClick={handleNext}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <span>{steps[currentStep].action}</span>
              {currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 步骤指示器 */}
        <div className="bg-gray-50 px-6 py-4">
          <div className="flex justify-center space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-blue-500'
                    : completedSteps.includes(index)
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;