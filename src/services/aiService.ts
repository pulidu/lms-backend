import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import { ChatHistory, IChatMessage } from '../models/Interactions.js';
import { StudentProfile } from '../models/Profiles.js';
import { Subject, Attendance, Mark } from '../models/Academics.js';
import { Assignment, AssignmentSubmission } from '../models/Assignments.js';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || 'mock_key';

let aiInstance: any = null;
if (apiKey && apiKey !== 'gemini_api_key_here' && apiKey !== 'mock_key') {
  try {
    aiInstance = new GoogleGenerativeAI(apiKey);
  } catch (err) {
    console.warn('Failed to initialize GoogleGenerativeAI with provided key. Using simulation fallback.', err);
  }
}

// Helper to gather student context
export const getStudentAcademicContext = async (studentId: string): Promise<string> => {
  try {
    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    // 1. Get profile & GPA
    const profile = await StudentProfile.findOne({ userId: studentObjectId });
    const gpa = profile?.currentGPA || 0;
    const registrationNumber = profile?.registrationNumber || 'N/A';

    // 2. Get subjects and attendance
    const attendanceRecords = await Attendance.find({ studentId: studentObjectId }).populate('subjectId');
    const subjectStats: { [key: string]: { present: number; total: number; name: string } } = {};
    
    attendanceRecords.forEach((record: any) => {
      if (record.subjectId) {
        const subId = record.subjectId._id.toString();
        if (!subjectStats[subId]) {
          subjectStats[subId] = { present: 0, total: 0, name: record.subjectId.name };
        }
        subjectStats[subId].total += 1;
        if (record.status === 'present' || record.status === 'late') {
          subjectStats[subId].present += 1;
        }
      }
    });

    const attendanceSummary = Object.values(subjectStats)
      .map(s => `${s.name}: ${((s.present / s.total) * 100).toFixed(1)}% (${s.present}/${s.total} classes)`)
      .join('\n');

    // 3. Get marks
    const marksRecords = await Mark.find({ studentId: studentObjectId })
      .populate('subjectId')
      .populate('examId');

    const marksSummary = marksRecords
      .map((m: any) => `${m.subjectId?.name || 'Subject'} - ${m.examId?.title || 'Exam'}: ${m.marksObtained} Marks (Grade: ${m.grade})`)
      .join('\n');

    // 4. Get assignments and submissions
    // We get all assignments for the subjects the student takes
    const enrollments = attendanceRecords.map((r: any) => r.subjectId?._id).filter(Boolean);
    const uniqueSubjects = Array.from(new Set(enrollments.map(id => id.toString()))).map(id => new mongoose.Types.ObjectId(id));
    
    const assignments = await Assignment.find({ subjectId: { $in: uniqueSubjects } }).populate('subjectId');
    const submissions = await AssignmentSubmission.find({ studentId: studentObjectId });

    const submissionMap = new Map(submissions.map(s => [s.assignmentId.toString(), s]));
    
    const pendingAssignments: string[] = [];
    const submittedAssignments: string[] = [];

    assignments.forEach((a: any) => {
      const sub = submissionMap.get(a._id.toString());
      if (sub) {
        submittedAssignments.push(`${a.title} (${a.subjectId?.name}) - Status: ${sub.status.toUpperCase()}, Graded Marks: ${sub.marksObtained || 'Not Graded'}`);
      } else {
        const isOverdue = new Date() > new Date(a.dueDate);
        pendingAssignments.push(`${a.title} (${a.subjectId?.name}) - Due: ${new Date(a.dueDate).toLocaleDateString()} ${isOverdue ? '(OVERDUE)' : ''}`);
      }
    });

    const context = `
Student ID Context:
- Registration Number: ${registrationNumber}
- Current Cumulative GPA: ${gpa.toFixed(2)}
- Academic Year/Semester: ${profile?.academicYear || 'N/A'} - Semester ${profile?.semester || 1}

Attendance Record Summary:
${attendanceSummary || 'No attendance records found.'}

Academic Marks & Exam Grades:
${marksSummary || 'No marks published yet.'}

Pending Assignments:
${pendingAssignments.length > 0 ? pendingAssignments.join('\n') : 'No pending assignments.'}

Submitted Assignments:
${submittedAssignments.length > 0 ? submittedAssignments.join('\n') : 'No assignments submitted yet.'}
`;
    return context.trim();
  } catch (err) {
    console.error('Error fetching academic context:', err);
    return 'Could not retrieve student database context due to server error.';
  }
};

export const chatWithAcademicAssistant = async (
  studentId: string,
  userMessage: string
): Promise<string> => {
  const studentObjectId = new mongoose.Types.ObjectId(studentId);

  // 1. Get student DB context
  const academicContext = await getStudentAcademicContext(studentId);

  // 2. Fetch or create chat history
  let chatHistory = await ChatHistory.findOne({ studentId: studentObjectId });
  if (!chatHistory) {
    chatHistory = new ChatHistory({ studentId: studentObjectId, messages: [] });
  }

  // 3. Format history for model
  const historyMessages = chatHistory.messages.slice(-10); // Keep last 10 messages for context

  let aiResponseText = '';

  if (aiInstance) {
    try {
      const systemInstruction = `You are an AI Academic Assistant for an online LMS.
You have access to the student's real-time academic record database context below.
Always answer using only this factual database context. If the student asks about something not in this context (like external general knowledge), answer politely but pivot back to helping them with their academic progress.
Provide encouraging, professional responses. Use simple markdown.
CRITICAL: Respond in the same language as the student's message. For example, if the query is in Sinhala, you must respond in Sinhala, translating any necessary database context into Sinhala for the user.

Student Academic Database Context:
${academicContext}`;

      const model = aiInstance.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction,
      });

      const chatSession = model.startChat({
        history: historyMessages.map(m => ({
          role: m.sender === 'student' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }))
      });

      const result = await chatSession.sendMessage(userMessage);
      aiResponseText = result.response.text() || 'I am sorry, I could not generate a response.';
    } catch (err) {
      console.error('Gemini API request failed. Falling back to Simulated Academic Assistant:', err);
      aiResponseText = generateSimulatedResponse(userMessage, academicContext);
    }
  } else {
    // Simulated fallback assistant
    aiResponseText = generateSimulatedResponse(userMessage, academicContext);
  }

  // 4. Save to database history
  chatHistory.messages.push({ sender: 'student', text: userMessage, timestamp: new Date() } as IChatMessage);
  chatHistory.messages.push({ sender: 'ai', text: aiResponseText, timestamp: new Date() } as IChatMessage);
  await chatHistory.save();

  return aiResponseText;
};

// Simulation engine for AI chatbot that extracts matching keywords from DB context
function generateSimulatedResponse(query: string, context: string): string {
  const lowerQuery = query.toLowerCase();
  const isSinhala = /[\u0D80-\u0DFF]/.test(query) || lowerQuery.includes('sinhala') || lowerQuery.includes('සිංහල');
  
  // Format context sections for easy searching
  const gpaMatch = context.match(/Current Cumulative GPA:\s*([^\n]+)/);
  const regMatch = context.match(/Registration Number:\s*([^\n]+)/);
  
  const attendanceSection = context.substring(
    context.indexOf('Attendance Record Summary:'),
    context.indexOf('Academic Marks & Exam Grades:')
  );
  
  const marksSection = context.substring(
    context.indexOf('Academic Marks & Exam Grades:'),
    context.indexOf('Pending Assignments:')
  );

  const pendingSection = context.substring(
    context.indexOf('Pending Assignments:'),
    context.indexOf('Submitted Assignments:')
  );

  const submittedSection = context.substring(
    context.indexOf('Submitted Assignments:')
  );

  let response = '';

  if (isSinhala) {
    response = 'ආයුබෝවන්! මම ඔබේ කෘතිම බුද්ධි ශාස්ත්‍රීය සහායකයා. ඔබේ වාර්තා මත පදනම්ව මෙන්න ඔබේ තොරතුරු:\n\n';

    if (lowerQuery.includes('gpa') || lowerQuery.includes('ලකුණු') || lowerQuery.includes('ප්‍රතිඵල')) {
      const gpaVal = gpaMatch ? gpaMatch[1] : '0.00';
      response += `📊 **GPA තොරතුරු:**\nඔබේ වත්මන් සමුච්චිත GPA අගය **${gpaVal}** වේ.\n`;
    } 
    if (lowerQuery.includes('attendance') || lowerQuery.includes('පැමිණීම') || lowerQuery.includes('දින')) {
      const attText = attendanceSection.replace('Attendance Record Summary:', '').trim() || 'කිසිදු පැමිණීමේ වාර්තාවක් හමු නොවීය.';
      const translatedAtt = attText
        .replace(/present/g, 'පැමිණ සිටී')
        .replace(/absent/g, 'නොපැමිණි')
        .replace(/classes/g, 'පන්ති')
        .replace(/No attendance records found./g, 'කිසිදු පැමිණීමේ වාර්තාවක් හමු නොවීය.');
      response += `📅 **පැමිණීමේ තත්ත්වය:**\n${translatedAtt}\n`;
    }
    if (lowerQuery.includes('mark') || lowerQuery.includes('grade') || lowerQuery.includes('result') || lowerQuery.includes('ශ්‍රේණි') || lowerQuery.includes('විභාග')) {
      const marksText = marksSection.replace('Academic Marks & Exam Grades:', '').trim() || 'තවමත් ලකුණු ප්‍රකාශයට පත් කර නොමැත.';
      const translatedMarks = marksText
        .replace(/Marks/g, 'ලකුණු')
        .replace(/Grade/g, 'ශ්‍රේණිය')
        .replace(/Exam/g, 'විභාගය');
      response += `📝 **ලකුණු සහ ශ්‍රේණි:**\n${translatedMarks}\n`;
    }
    if (lowerQuery.includes('assignment') || lowerQuery.includes('පැවරුම්') || lowerQuery.includes('වැඩ')) {
      const pendingText = pendingSection.replace('Pending Assignments:', '').trim() || 'ඉතිරි පැවරුම් කිසිවක් නැත.';
      const submittedText = submittedSection.replace('Submitted Assignments:', '').trim() || 'භාරදුන් පැවරුම් කිසිවක් නැත.';
      
      const translatedPending = pendingText
        .replace(/Due:/g, 'අවසන් දිනය:')
        .replace(/OVERDUE/g, 'කල් ඉකුත් වී ඇත');
      const translatedSubmitted = submittedText
        .replace(/Status:/g, 'තත්ත්වය:')
        .replace(/Graded Marks:/g, 'ලකුණු:')
        .replace(/Not Graded/g, 'ලකුණු ලබා දී නැත');

      response += `⏳ **ඉතිරිව ඇති පැවරුම්:**\n${translatedPending}\n\n`;
      response += `✅ **භාරදුන් පැවරුම්:**\n${translatedSubmitted}\n`;
    }
    
    if (response === 'ආයුබෝවන්! මම ඔබේ කෘතිම බුද්ධි ශාස්ත්‍රීය සහායකයා. ඔබේ වාර්තා මත පදනම්ව මෙන්න ඔබේ තොරතුරු:\n\n') {
      const gpaVal = gpaMatch ? gpaMatch[1] : '0.00';
      const regVal = regMatch ? regMatch[1] : 'N/A';
      response += `👋 **ශාස්ත්‍රීය දළ විශ්ලේෂණය:**\n`;
      response += `- **GPA:** ${gpaVal}\n`;
      response += `- **ලියාපදිංචි අංකය:** ${regVal}\n\n`;
      response += `ඔබේ **GPA**, **පැමිණීම** (attendance), **ලකුණු** (marks), හෝ **පැවරුම්** (assignments) පිළිබඳව සිංහලෙන් අසන්න!`;
    }

    response += `\n\n*(සටහන: මෙම පිළිතුර ඔබේ සත්‍ය ශිෂ්‍ය වාර්තා වලින් සෘජුවම ලබාගෙන ඇත)*`;
  } else {
    response = 'Hello! I am your AI Academic Assistant. Here is your request based on your records:\n\n';

    if (lowerQuery.includes('gpa')) {
      response += `📊 **GPA Information:**\nYour current Cumulative GPA is **${gpaMatch ? gpaMatch[1] : '0.00'}**.\n`;
    } 
    if (lowerQuery.includes('attendance')) {
      response += `📅 **Attendance Status:**\n${attendanceSection.replace('Attendance Record Summary:', '').trim() || 'No attendance records logged.'}\n`;
    } 
    if (lowerQuery.includes('mark') || lowerQuery.includes('grade') || lowerQuery.includes('result')) {
      response += `📝 **Grades & Marks:**\n${marksSection.replace('Academic Marks & Exam Grades:', '').trim() || 'No grades published.'}\n`;
    } 
    if (lowerQuery.includes('assignment') && lowerQuery.includes('pending')) {
      response += `⏳ **Pending Assignments:**\n${pendingSection.replace('Pending Assignments:', '').trim() || 'No pending assignments.'}\n`;
    } else if (lowerQuery.includes('assignment')) {
      response += `⏳ **Pending Assignments:**\n${pendingSection.replace('Pending Assignments:', '').trim() || 'No pending assignments.'}\n\n`;
      response += `✅ **Submitted Assignments:**\n${submittedSection.replace('Submitted Assignments:', '').trim() || 'No submitted assignments.'}\n`;
    } 
    if (lowerQuery.includes('subject') || lowerQuery.includes('course') || lowerQuery.includes('enrolled')) {
      response += `🎓 **Enrolled Courses & Subjects:**\nBased on your attendance roster, you are attending:\n${attendanceSection.replace('Attendance Record Summary:', '').trim() || 'No enrolled subjects found.'}\n`;
    } 
    
    if (response === 'Hello! I am your AI Academic Assistant. Here is your request based on your records:\n\n') {
      response += `👋 **Academic Overview Summary:**\n`;
      response += `- **GPA:** ${gpaMatch ? gpaMatch[1] : '0.00'}\n`;
      response += `- **Registration:** ${regMatch ? regMatch[1] : 'N/A'}\n\n`;
      response += `Ask me specifically about your **GPA**, **attendance**, **marks**, or **pending assignments** and I will pull the live details for you!`;
    }

    response += `\n\n*(Note: This response is generated directly from your verified student records)*`;
  }
  
  return response;
}
