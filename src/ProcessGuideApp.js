import React, { useState, useEffect } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMermaid from 'remark-mermaidjs';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, AlertTriangle, X } from 'lucide-react';
import PROCESSES from './generatedProcesses.json';

const Card = ({ className, children }) => (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ children }) => (
    <div className="p-4 border-b border-gray-100">{children}</div>
);

const CardTitle = ({ children }) => (
    <h2 className="text-xl font-semibold text-gray-800">{children}</h2>
);

const CardContent = ({ children }) => (
    <div className="p-4">{children}</div>
);

const Button = ({ variant = "primary", className = "", icon, children, ...props }) => {
    const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors";
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700",
        outline: "border border-gray-300 text-gray-700 hover:bg-gray-50"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            {...props}
        >
            {icon && <span className="mr-2">{icon}</span>}
            {children}
        </button>
    );
};

const ProgressBar = ({ current, total }) => {
    const percentage = (current / (total - 1)) * 100;

    return (
        <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progression</span>
                <span>Étape {current + 1} sur {total}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
                <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

const TaskCheckbox = ({ checked, onChange, children }) => (
    <label className="flex items-start space-x-3 cursor-pointer">
        <div className="flex items-center h-6">
            <input
                type="checkbox"
                className="hidden"
                checked={checked}
                onChange={onChange}
            />
            {checked ? (
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
            ) : (
                <Circle className="w-5 h-5 text-gray-400" />
            )}
        </div>
        <span className={`flex-1 text-gray-700 ${checked ? 'line-through text-gray-400' : ''}`}>
            {children}
        </span>
    </label>
);

const ProcessGuideApp = () => {
    const [processedContent, setProcessedContent] = useState('');
    const [currentProcessId, setCurrentProcessId] = useState(() => {
        const pathParts = window.location.pathname.split('/');
        const urlProcessId = pathParts[pathParts.length - 1];
        // Find process in array
        return PROCESSES.find(p => p.id === urlProcessId)?.id || PROCESSES[0].id;
    });

    const [currentStepIndex, setCurrentStepIndex] = useState(() => {
        const saved = localStorage.getItem(`${currentProcessId}-currentStepIndex`);
        return saved ? parseInt(saved, 10) : 0;
    });

    const [completedSteps, setCompletedSteps] = useState(() => {
        const saved = localStorage.getItem(`${currentProcessId}-processStepProgress`);
        return saved ? JSON.parse(saved) : {};
    });

    const [completedTasks, setCompletedTasks] = useState(() => {
        const saved = localStorage.getItem(`${currentProcessId}-processTaskProgress`);
        return saved ? JSON.parse(saved) : {};
    });

    // Find current process from array
    const currentProcess = PROCESSES.find(p => p.id === currentProcessId) || PROCESSES[0];
    const currentStep = currentProcess.steps[currentStepIndex] || {
        id: '',
        title: '',
        description: '',
        actionItems: []
    };

    // Load process-specific progress when switching processes
    useEffect(() => {
        const loadProcessProgress = () => {
            const savedSteps = localStorage.getItem(`${currentProcessId}-processStepProgress`);
            const savedTasks = localStorage.getItem(`${currentProcessId}-processTaskProgress`);
            const savedIndex = localStorage.getItem(`${currentProcessId}-currentStepIndex`);

            setCompletedSteps(savedSteps ? JSON.parse(savedSteps) : {});
            setCompletedTasks(savedTasks ? JSON.parse(savedTasks) : {});
            setCurrentStepIndex(savedIndex ? parseInt(savedIndex, 10) : 0);
        };

        loadProcessProgress();
    }, [currentProcessId]);


    // Update URL when process changes
    useEffect(() => {
        const newPath = `/process/${currentProcessId}`;
        // Update URL without full page reload
        window.history.pushState({}, '', `${newPath}${window.location.hash}`);
    }, [currentProcessId]);

    // Handle browser back/forward
    useEffect(() => {
        const handleLocationChange = () => {
            const pathParts = window.location.pathname.split('/');
            const processId = pathParts[pathParts.length - 1];
            if (PROCESSES[processId] && processId !== currentProcessId) {
                setCurrentProcessId(processId);
            }
        };

        window.addEventListener('popstate', handleLocationChange);
        return () => window.removeEventListener('popstate', handleLocationChange);
    }, [currentProcessId]);

    // Save current process progress
    useEffect(() => {
        const saveProcessProgress = () => {
            localStorage.setItem(`${currentProcessId}-currentStepIndex`, currentStepIndex.toString());
            localStorage.setItem(`${currentProcessId}-processStepProgress`, JSON.stringify(completedSteps));
            localStorage.setItem(`${currentProcessId}-processTaskProgress`, JSON.stringify(completedTasks));
        };

        saveProcessProgress();
    }, [currentProcessId, currentStepIndex, completedSteps, completedTasks]);

    // Update URL when step changes
    useEffect(() => {
        window.location.hash = `step-${currentStepIndex + 1}`;
    }, [currentStepIndex]);

    // Process markdown content
    useEffect(() => {
        const processor = unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkMermaid, {
                theme: 'default',
                css: `
                    .mermaid {
                        background: white;
                        padding: 1rem;
                        border-radius: 0.5rem;
                        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                        margin: 1rem 0;
                    }
                `
            })
            .use(remarkRehype, { allowDangerousHtml: true })
            .use(rehypeStringify, { allowDangerousHtml: true });

        const processContent = async () => {
            try {
                const result = await processor.process(currentStep.description || '');
                setProcessedContent(String(result));
            } catch (error) {
                console.error('Error processing markdown:', error);
                setProcessedContent('');
            }
        };

        processContent();
    }, [currentStep.description]);


    const handleProcessChange = (newProcessId) => {
        if (newProcessId === currentProcessId) return;

        setCurrentProcessId(newProcessId);

        // Update URL without page reload
        const newUrl = `/process/${newProcessId}#step-1`;
        window.history.pushState({}, '', newUrl);

        setCurrentStepIndex(0);
    };

    const navigateStep = (direction) => {
        const isFirstStep = currentStepIndex === 0;
        const isLastStep = currentStepIndex === currentProcess.steps.length - 1;

        if (direction === 'next' && !isLastStep) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else if (direction === 'prev' && !isFirstStep) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    };

    const toggleStepComplete = () => {
        const stepKey = `${currentProcessId}-${currentStep.id}`;
        setCompletedSteps(prev => ({
            ...prev,
            [stepKey]: !prev[stepKey]
        }));
    };

    const toggleTaskCompletion = (stepId, taskIndex) => {
        const taskKey = `${currentProcessId}-${stepId}-${taskIndex}`;
        setCompletedTasks(prev => ({
            ...prev,
            [taskKey]: !prev[taskKey]
        }));
    };

    const resetProgress = () => {
        if (window.confirm('Êtes-vous sûr de vouloir réinitialiser la progression de ce processus ?')) {
            setCurrentStepIndex(0);
            setCompletedSteps({});
            setCompletedTasks({});

            localStorage.removeItem(`${currentProcessId}-currentStepIndex`);
            localStorage.removeItem(`${currentProcessId}-processStepProgress`);
            localStorage.removeItem(`${currentProcessId}-processTaskProgress`);

            window.location.hash = 'step-1';
        }
    };

    const StorageWarning = () => {
        const [isVisible, setIsVisible] = useState(true);

        useEffect(() => {
            // Check if user has already seen the notice
            const hasSeenNotice = localStorage.getItem('hasSeenStorageNotice');
            if (hasSeenNotice) {
                setIsVisible(false);
            }
        }, []);

        const dismissNotice = () => {
            localStorage.setItem('hasSeenStorageNotice', 'true');
            setIsVisible(false);
        };

        if (!isVisible) return null;

        return (
            <div className="mt-8 mb-12 p-4 bg-amber-50 border border-amber-200 rounded-lg shadow-sm">
                <div className="flex items-start justify-between">
                    <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-medium text-amber-800">
                                Information sur le stockage de l'état
                            </h4>
                            <p className="mt-1 text-sm text-amber-700">
                                La progression est précieusement conservée dans le navigateur ! 🎯
                                Attention toutefois : elle disparaîtra si tu nettoies les données du navigateur ou en utilisant le mode navigation privée. 🪄
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={dismissNotice}
                        className="ml-4 text-amber-600 hover:text-amber-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    };


    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-4xl">
                <StorageWarning />
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    Mes processus
                </h1>
                {/* Process Selector */}
                <div className="mb-6">
                    <label
                        htmlFor="process-selector"
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        Sélectionner un processus
                    </label>
                    <select
                        value={currentProcessId}
                        onChange={(e) => handleProcessChange(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                        {PROCESSES.map(process => (
                            <option key={process.id} value={process.id}>
                                {process.title}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Process Title and Description */}
                <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-gray-100">
                    <div className="max-w-3xl">
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">
                            {currentProcess.title}
                        </h2>
                        <p className="text-gray-600 text-lg leading-relaxed mb-6">
                            {currentProcess.description}
                        </p>
                    </div>
                    {/* Progress Summary */}
                    <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                        <ProgressBar current={currentStepIndex} total={currentProcess.steps.length} />
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-medium text-gray-600">
                                    Progression - {currentProcess.title}
                                </h3>
                                <p className="text-lg font-bold text-gray-800">
                                    {Object.keys(completedSteps).filter(key => key.startsWith(currentProcessId)).length} sur {currentProcess.steps.length} étapes terminées
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={resetProgress}
                                className="text-red-600 hover:bg-red-50"
                            >
                                Réinitialiser ce processus
                            </Button>
                        </div>
                    </div>
                </div>





                {/* Current Step Card */}
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>
                                    Étape {currentStepIndex + 1}: {currentStep.title}
                                </CardTitle>
                                {completedSteps[`${currentProcessId}-${currentStep.id}`] && (
                                    <span className="inline-flex items-center text-sm font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full mt-1">
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                        Terminé
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => navigateStep('prev')}
                                    disabled={currentStepIndex === 0}
                                    className={`transition-opacity ${currentStepIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Précédent
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => navigateStep('next')}
                                    disabled={currentStepIndex === currentProcess.steps.length - 1}
                                    className={`transition-opacity ${currentStepIndex === currentProcess.steps.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                                >
                                    Suivant
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="prose prose-blue max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: processedContent }} />
                        </div>

                        {currentStep.actionItems && currentStep.actionItems.length > 0 && (
                            <div className="mt-6 border-t border-gray-100 pt-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Tâches</h3>
                                <div className="space-y-2">
                                    {currentStep.actionItems.map((task, index) => (
                                        <TaskCheckbox
                                            key={index}
                                            checked={!!completedTasks[`${currentProcessId}-${currentStep.id}-${index}`]}
                                            onChange={() => toggleTaskCompletion(currentStep.id, index)}
                                        >
                                            {task}
                                        </TaskCheckbox>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <Button
                                onClick={toggleStepComplete}
                                variant={completedSteps[`${currentProcessId}-${currentStep.id}`] ? "outline" : "primary"}
                            >
                                {completedSteps[`${currentProcessId}-${currentStep.id}`] ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Marquer comme Non Terminée
                                    </>
                                ) : (
                                    'Marquer comme Terminée'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProcessGuideApp;
