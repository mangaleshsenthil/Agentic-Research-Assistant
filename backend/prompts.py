# ── Agent 1: Summarization Agent (Gemini) ─────────────────────────

SECTION_EXTRACTION_PROMPT = """
You are an expert Academic Document Analyst.
Task: Identify ALL major section headings from the following research paper text.

Rules:
1. Extract only real section/chapter headings (e.g., "Abstract", "Introduction", "Methodology", "Results", "Discussion", "Conclusion", "Related Work", etc.)
2. Include numbered headings if present (e.g., "3.1 Data Collection")
3. Do NOT include figure captions, table titles, or references as headings
4. Return ONLY a valid JSON array of strings, nothing else

Example output: ["Abstract", "1. Introduction", "2. Related Work", "3. Methodology", "3.1 Data Collection", "4. Results", "5. Discussion", "6. Conclusion"]

Paper text:
{text}
"""

FULL_SUMMARY_PROMPT = """
You are an expert Academic Research Assistant and Technical Document Architect.
Task: Provide an exceptionally formal, structured, and comprehensive summary of this research paper.

Format the output EXACTLY according to this 12-section design:

# Structured Summary: [Title/Main Focus]

## 1. Project Title
[Descriptive and professional title]

## 2. Problem Definition
[Clearly define the research problem, objectives, and significance]

## 3. Mathematical Model
[Describe the relationship between variables, equations used, and theoretical foundation]

## 4. Objective Function
[Describe how model accuracy is evaluated, including specific formulas like MSE if applicable]

## 5. Optimization Technique
[Detail the iterative algorithm or methodology used to solve the problem]

## 6. Algorithm Workflow
[Step-by-step breakdown of the execution flow: Initialization, Steps, Iteration, etc.]

## 7. Inputs
[List of required data, parameters, thresholds]

## 8. Outputs
[List of optimized parameters and results]

## 9. Convergence Condition
[Specific conditions for stopping or measuring success]

## 10. Expected Result
[The anticipated outcome of the research]

## 11. Applications
[Real-world use cases and impact]

## 12. Conclusion
[Final overarching summary of the research and its value]

Paper context:
{context}
"""

SECTION_SUMMARY_PROMPT = """
You are an expert Academic Research Assistant.
Task: Provide a structured summary of the following section from a research paper.

Section heading: {heading}

Format the output for this section using this formal structure:
### Section Analysis: {heading}

- **Primary Focus**: [Core topic of this section]
- **Technical/Theoretical Framework**: [Summary of methodology, data, or math in this section]
- **Key Takeaways & Findings**: [Crucial points and results]

Section content:
{content}

Instructions:
1. Maintain the high-level professional tone of an academic architect.
2. Be technically precise.
"""

# ── Agent 2: Research Discovery Agent (Groq) ─────────────────────

RESEARCH_DISCOVERY_PROMPT = """
You are a Senior Research Advisor and Innovation Strategist.
Task: Analyze the research paper text provided at the end of this prompt and provide comprehensive research discovery insights.

You MUST respond with a perfectly valid JSON object structured exactly like the schema below:

{{
  "future_ideas": [
    {{
      "title": "Idea title",
      "description": "Detailed description of the research idea",
      "impact": "Why this matters"
    }}
  ],
  "alternative_models": [
    {{
      "name": "Model/approach name",
      "description": "How it could be applied to this research",
      "advantage": "Why it might improve results"
    }}
  ],
  "related_papers": [
    {{
      "title": "Paper title",
      "authors": "Author names",
      "relevance": "How it relates to the current paper"
    }}
  ]
}}

RULES:
1. Provide at least 4 items in each category.
2. Be specific and actionable — avoid vague suggestions.
3. For alternative models, suggest real ML/DL architectures, statistical methods, or computational approaches.
4. Return ONLY the JSON object. Do NOT include any preamble, and absolutely DO NOT output raw mathematical equations from the paper.

--- PAPER CONTEXT START ---
{context}
--- PAPER CONTEXT END ---
"""

# ── Agent 3: Workflow Generator Agent (Groq + Gemini Image) ──────

WORKFLOW_GENERATION_PROMPT = r"""
You are a Senior Research Project Architect and Technical Lead.
Task: Generate a formal, structured research project workflow for the following idea/approach.

Selected idea/approach: {selected_item}

Context from the original research paper: {context}

Generate a comprehensive project workflow that follows the EXACT 12-section structure below. 

### Workflow Design:

1. **Project Title**: [Develop a descriptive and professional title]
2. **Problem Definition**: [Define the research problem, objectives, and its technical significance]
3. **Mathematical Model**: [Describe the theoretical foundation, variables, and core equations]
4. **Objective Function**: [Detail the evaluation logic or loss functions used to measure success]
5. **Optimization Technique**: [Explain the iterative methodology or algorithm used to solve the problem]
6. **Algorithm Workflow**: [High-level step-by-step breakdown of the execution flow]
7. **Inputs**: [List of experimental parameters, datasets, and configurations]
8. **Outputs**: [List of resulting parameters, metrics, and technical deliverables]
9. **Convergence Condition**: [Specific criteria for termination or success achievement]
10. **Expected Result**: [The anticipated technical outcome and its interpretation]
11. **Applications**: [Real-world use cases and potential field impact]
12. **Full Implementation Pseudo-code**:
    Provide a highly detailed algorithmic pseudo-code following this EXACT reference style:

```text
ALGORITHM [Algorithm_Name]

INPUT:
    [Parameter 1]
    [Parameter 2]
    ...

OUTPUT:
    [Result 1]
    [Result 2]
    ...

BEGIN

1. [High-level Initialization/Step]
       [sub-step or code-like operation]
       [sub-step or code-like operation]

2. Define function [FunctionName]([params])
       return [logical result]

3. [Main Loop/Process]
       FOR [condition] DO
            [logic]
       END FOR

4. [Optimization Loop]
       WHILE [condition] DO
            [logic]
            IF [exit condition] THEN
                 BREAK
            END IF
       END WHILE

5. PRINT [Final Results/Metrics]

END
```

Ensure the pseudo-code covers the *entire pipeline* from data input to evaluation metrics. Use formal academic nomenclature and LaTeX for mathematical formulas where appropriate.
- **CRITICAL**: Use LaTeX for ALL mathematical symbols, variables, formulas, and equations within the pseudo-code block (e.g., $w \leftarrow w - \alpha \nabla L$).
- Ensure the overall structure is clean, logical, and easy to read.
- Use LaTeX for any mathematical formulas (e.g., $E = mc^2$).
"""