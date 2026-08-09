The Situation
The AI Cohort is a 31-day enterprise AI engineering program covering modern AI topics including:

Retrieval-Augmented Generation (RAG)
Vector Databases
Prompt Engineering
Agentic AI
Model Context Protocol (MCP)
AI Deployment
Production AI Systems
After completing the cohort, learners should be able to confidently explain the systems they built and the engineering decisions behind them.

However, preparing for technical interviews and effectively communicating this knowledge remains one of the biggest challenges.

Your task is to build an AI Interview Agent that conducts personalized technical interviews based on a candidate's learning journey throughout the cohort.

Your Challenge
Design and build an AI agent capable of conducting a realistic, multi-turn technical interview.

The interview should:

Assess the candidate's understanding of the concepts they have completed.
Adapt naturally throughout the conversation.
Ask intelligent follow-up questions.
Maintain context across the interview.
Provide actionable feedback at the end.
The overall experience should resemble a real technical interview rather than a scripted questionnaire.

What You're Given
Every team will receive the following resources:

1. Curriculum
A structured JSON containing the complete 31-day AI Cohort curriculum, including:

Modules
Daily topics
Learning objectives
Tools used throughout the program
2. Candidate Profiles
A collection of candidate profiles describing each participant's progress through the cohort, including:

Completed missions
Attempts
Skipped topics
Learning signals
3. Technical Specification
A separate document defining:

Required API contract
Submission requirements
Request/response formats
Minimum Requirements
Your solution must:

Conduct a conversational technical interview.
Ask a minimum of 8 questions covering at least 4 different curriculum days.
Generate follow-up questions based on previous responses.
Maintain conversation context throughout the interview.
Produce structured feedback at the end of the interview.
Expose the required HTTP endpoint defined in the Technical Specification.
You are free to choose any:

AI models
Frameworks
Agent orchestration strategy
Retrieval pipeline
System architecture
Out of Scope
The following are not required:

Voice interaction
User authentication
Persistent user accounts
Long-term conversation history
Mobile applications
Notes
All curriculum and candidate data provided for this challenge are synthetic and intended solely for the hackathon.
Teams may use any AI models, agent frameworks, vector databases, or supporting technologies.
Creativity in interview flow, reasoning, interaction design, and overall user experience is highly encouraged.
Attached Resources
Curriculum JSON
Candidate Profiles
Technical Specification
