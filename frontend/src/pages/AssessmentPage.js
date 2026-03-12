import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AssessmentPage = () => {
  const navigate = useNavigate();
  const [assessmentType, setAssessmentType] = useState(null); // 'anxiety' or 'depression'
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  // Depression screening questions (PHQ-9 style)
  const depressionQuestions = [
    { id: 'd1', text: 'Little interest or pleasure in doing things?' },
    { id: 'd2', text: 'Feeling down, depressed, or hopeless?' },
    { id: 'd3', text: 'Trouble falling/staying asleep, or sleeping too much?' },
    { id: 'd4', text: 'Feeling tired or having little energy?' },
    { id: 'd5', text: 'Poor appetite or overeating?' },
    { id: 'd6', text: 'Feeling bad about yourself or that you are a failure?' },
    { id: 'd7', text: 'Trouble concentrating on things?' },
    { id: 'd8', text: 'Moving or speaking slowly, or being fidgety/restless?' },
    { id: 'd9', text: 'Thoughts that you would be better off dead?' },
  ];

  // Anxiety screening questions (GAD-7 style)
  const anxietyQuestions = [
    { id: 'a1', text: 'Feeling nervous, anxious, or on edge?' },
    { id: 'a2', text: 'Not being able to stop or control worrying?' },
    { id: 'a3', text: 'Worrying too much about different things?' },
    { id: 'a4', text: 'Trouble relaxing?' },
    { id: 'a5', text: 'Being so restless that it is hard to sit still?' },
    { id: 'a6', text: 'Becoming easily annoyed or irritable?' },
    { id: 'a7', text: 'Feeling afraid as if something awful might happen?' },
  ];

  const responseOptions = [
    { value: 0, label: 'Not at all' },
    { value: 1, label: 'Several days' },
    { value: 2, label: 'More than half the days' },
    { value: 3, label: 'Nearly every day' },
  ];

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const calculateScore = () => {
    const questions = assessmentType === 'depression' ? depressionQuestions : anxietyQuestions;
    const totalScore = questions.reduce((sum, q) => sum + (answers[q.id] || 0), 0);
    
    let severity = '';
    let message = '';
    let solutions = [];
    let color = '';

    if (assessmentType === 'depression') {
      // PHQ-9 scoring
      if (totalScore <= 4) {
        severity = 'Minimal or None';
        message = 'Your responses suggest minimal or no depression symptoms.';
        color = 'emerald';
        solutions = [
          'Continue maintaining healthy habits like regular exercise and sleep',
          'Practice gratitude journaling daily',
          'Stay connected with friends and family',
          'Engage in hobbies and activities you enjoy',
          'Consider mindfulness or meditation practices',
        ];
      } else if (totalScore <= 9) {
        severity = 'Mild Depression';
        message = 'Your responses suggest mild depression symptoms.';
        color = 'yellow';
        solutions = [
          'Consider talking to a mental health professional',
          'Increase physical activity (30 mins daily walking)',
          'Establish a consistent sleep schedule',
          'Limit alcohol and caffeine intake',
          'Practice cognitive behavioral techniques',
          'Join support groups or community activities',
          'Use our mood tracker daily to monitor patterns',
        ];
      } else if (totalScore <= 14) {
        severity = 'Moderate Depression';
        message = 'Your responses suggest moderate depression symptoms.';
        color = 'orange';
        solutions = [
          '⚠️ Strongly recommend seeing a mental health professional',
          'Consider therapy (CBT, DBT, or talk therapy)',
          'Discuss medication options with a psychiatrist',
          'Create a daily routine and stick to it',
          'Avoid isolation - reach out to trusted friends/family',
          'Practice self-compassion and avoid negative self-talk',
          'Use our emergency support if you feel overwhelmed',
          'Exercise regularly (proven to help depression)',
        ];
      } else if (totalScore <= 19) {
        severity = 'Moderately Severe Depression';
        message = 'Your responses suggest moderately severe depression symptoms.';
        color = 'red';
        solutions = [
          '🚨 Please see a mental health professional as soon as possible',
          'Schedule an appointment with a psychiatrist for evaluation',
          'Contact your healthcare provider immediately',
          'Therapy + medication may be most effective',
          'Inform trusted family/friends about your situation',
          'Remove access to means of self-harm',
          'Use crisis helplines: National Suicide Prevention Lifeline 988',
          'Use our Panic Mode feature for immediate breathing exercises',
          'Set up emergency contacts in our Emergency Support page',
        ];
      } else {
        severity = 'Severe Depression';
        message = 'Your responses suggest severe depression symptoms.';
        color = 'rose';
        solutions = [
          '🆘 URGENT: Seek professional help immediately',
          'Visit emergency room or crisis center if having suicidal thoughts',
          'Call National Suicide Prevention Lifeline: 988 (US)',
          'Text HELLO to 741741 (Crisis Text Line)',
          'Do not stay alone - contact someone immediately',
          'Schedule emergency psychiatric evaluation',
          'Consider inpatient treatment if safety is a concern',
          'Use our Emergency Support to alert your trusted contact',
          'Remove all means of self-harm from your environment',
        ];
      }
    } else {
      // GAD-7 scoring for anxiety
      if (totalScore <= 4) {
        severity = 'Minimal Anxiety';
        message = 'Your responses suggest minimal or no anxiety symptoms.';
        color = 'emerald';
        solutions = [
          'Continue practicing stress management techniques',
          'Maintain regular exercise routine',
          'Practice deep breathing exercises (use our Panic Mode)',
          'Get adequate sleep (7-9 hours)',
          'Limit caffeine intake',
        ];
      } else if (totalScore <= 9) {
        severity = 'Mild Anxiety';
        message = 'Your responses suggest mild anxiety symptoms.';
        color = 'yellow';
        solutions = [
          'Practice progressive muscle relaxation daily',
          'Try mindfulness meditation (10-15 mins/day)',
          'Use our breathing exercises in Panic Mode regularly',
          'Identify and challenge anxious thoughts',
          'Limit news/social media consumption',
          'Consider therapy or counseling',
          'Exercise regularly (reduces anxiety)',
        ];
      } else if (totalScore <= 14) {
        severity = 'Moderate Anxiety';
        message = 'Your responses suggest moderate anxiety symptoms.';
        color = 'orange';
        solutions = [
          '⚠️ Recommend consulting a mental health professional',
          'Consider Cognitive Behavioral Therapy (CBT)',
          'Practice grounding techniques (5-4-3-2-1 method)',
          'Use our AI chatbot for anxiety management tips',
          'Create a worry journal to track triggers',
          'Learn to say "no" and set boundaries',
          'Avoid alcohol and excessive caffeine',
          'Join anxiety support groups',
        ];
      } else {
        severity = 'Severe Anxiety';
        message = 'Your responses suggest severe anxiety symptoms.';
        color = 'red';
        solutions = [
          '🚨 Please see a mental health professional urgently',
          'Schedule appointment with psychiatrist/therapist',
          'Consider medication evaluation',
          'Therapy (CBT/exposure therapy) is highly effective',
          'Use our Panic Mode immediately during attacks',
          'Practice breathing exercises multiple times daily',
          'Avoid caffeine, alcohol, and nicotine completely',
          'Inform trusted contacts - use Emergency Support',
          'Crisis helpline: Call/text 988 if feeling overwhelmed',
        ];
      }
    }

    setResult({
      score: totalScore,
      maxScore: questions.length * 3,
      severity,
      message,
      solutions,
      color,
      type: assessmentType,
    });
  };

  const resetAssessment = () => {
    setAssessmentType(null);
    setAnswers({});
    setResult(null);
  };

  // Assessment type selection screen
  if (!assessmentType) {
    return (
      <div className="module-shell">
        <div className="module-container-narrow">
          <div className="module-header-card mb-6">
            <h1 className="module-title">Mental Health Assessment</h1>
            <p className="module-subtitle">
              Confidential screening for anxiety and depression symptoms. Results are private and stored locally.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            <div className="module-panel hover:shadow-lg transition cursor-pointer h-full flex flex-col" onClick={() => setAssessmentType('depression')}>
              <div className="text-4xl mb-3">🧠</div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Depression Screening</h2>
              <p className="text-slate-600 mb-4 flex-1">
                9-question assessment to evaluate depression symptoms over the past 2 weeks. Based on PHQ-9 screening tool.
              </p>
              <button className="w-full rounded-xl bg-sky-600 text-white py-2.5 font-semibold hover:bg-sky-700 mt-auto">
                Start Depression Assessment
              </button>
            </div>

            <div className="module-panel hover:shadow-lg transition cursor-pointer h-full flex flex-col" onClick={() => setAssessmentType('anxiety')}>
              <div className="text-4xl mb-3">😰</div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Anxiety Screening</h2>
              <p className="text-slate-600 mb-4 flex-1">
                7-question assessment to evaluate anxiety symptoms over the past 2 weeks. Based on GAD-7 screening tool.
              </p>
              <button className="w-full rounded-xl bg-purple-600 text-white py-2.5 font-semibold hover:bg-purple-700 mt-auto">
                Start Anxiety Assessment
              </button>
            </div>
          </div>

          <div className="module-panel mt-6 bg-amber-50 border-amber-200">
            <h3 className="font-semibold text-slate-900 mb-2">⚠️ Important Disclaimer</h3>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• This is a screening tool, not a diagnosis</li>
              <li>• Results do not replace professional evaluation</li>
              <li>• If you're in crisis, call 988 (Suicide & Crisis Lifeline)</li>
              <li>• Always consult a mental health professional for concerns</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Results screen
  if (result) {
    return (
      <div className="module-shell">
        <div className="module-container-narrow">
          <div className={`rounded-2xl border-2 border-${result.color}-200 bg-${result.color}-50 p-6 mb-6`}>
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
                {result.type === 'depression' ? '🧠' : '😰'}
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{result.severity}</h2>
              <p className="text-slate-700 mt-2">{result.message}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Your Score</span>
                <span className="text-2xl font-bold text-slate-900">
                  {result.score} / {result.maxScore}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 mt-2">
                <div
                  className={`bg-${result.color}-500 h-3 rounded-full transition-all`}
                  style={{ width: `${(result.score / result.maxScore) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="module-panel mb-6">
            <h3 className="module-section-title">
              {result.solutions.some(s => s.includes('🆘') || s.includes('🚨')) ? '🚨 Recommended Actions' : '💡 Recommended Solutions'}
            </h3>
            <ul className="space-y-2">
              {result.solutions.map((solution, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-700">
                  <span className="text-sky-600 font-bold mt-1">✓</span>
                  <span>{solution}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="module-panel mb-6 bg-cyan-50 border-cyan-200">
            <h3 className="font-semibold text-slate-900 mb-2">🔗 Use Our Tools</h3>
            <div className="grid sm:grid-cols-2 gap-2 items-stretch">
              <button
                onClick={() => navigate('/mood-tracker')}
                className="rounded-lg bg-white border border-slate-300 py-2 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 h-full"
              >
                Track Your Mood
              </button>
              <button
                onClick={() => navigate('/panic-mode')}
                className="rounded-lg bg-white border border-slate-300 py-2 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 h-full"
              >
                Panic Mode Help
              </button>
              <button
                onClick={() => navigate('/emergency-support')}
                className="rounded-lg bg-white border border-slate-300 py-2 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 h-full"
              >
                Emergency Contact
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="rounded-lg bg-white border border-slate-300 py-2 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 h-full"
              >
                AI Chatbot
              </button>
            </div>
          </div>

          <div className="module-actions-row">
            <button
              onClick={resetAssessment}
              className="flex-1 module-btn-secondary"
            >
              Take Another Assessment
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 module-btn-primary"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Questions screen
  const currentQuestions = assessmentType === 'depression' ? depressionQuestions : anxietyQuestions;
  const allAnswered = currentQuestions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="module-shell">
      <div className="module-container-narrow">
        <div className="module-header-card mb-6">
          <h1 className="module-title">
            {assessmentType === 'depression' ? 'Depression' : 'Anxiety'} Assessment
          </h1>
          <p className="module-subtitle">
            Over the last 2 weeks, how often have you been bothered by the following?
          </p>
        </div>

        <div className="space-y-4">
          {currentQuestions.map((question, idx) => (
            <div key={question.id} className="module-panel">
              <h3 className="font-semibold text-slate-900 mb-3">
                {idx + 1}. {question.text}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {responseOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleAnswerChange(question.id, option.value)}
                    className={`py-3 px-3 rounded-xl text-sm font-medium transition ${
                      answers[question.id] === option.value
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="module-actions-row mt-6">
          <button
            onClick={resetAssessment}
            className="module-btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={calculateScore}
            disabled={!allAnswered}
            className="flex-1 module-btn-primary"
          >
            {allAnswered ? 'Get Results' : `Answer All Questions (${currentQuestions.filter(q => answers[q.id] !== undefined).length}/${currentQuestions.length})`}
          </button>
        </div>

        <div className="module-panel mt-6 bg-sky-50 border-sky-200">
          <p className="text-sm text-slate-700">
            💡 <strong>Tip:</strong> Answer honestly based on how you've felt in the past 2 weeks. There are no right or wrong answers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssessmentPage;
