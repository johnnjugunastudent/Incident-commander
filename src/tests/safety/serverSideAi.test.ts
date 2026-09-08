/**
 * Safety Test: Server-Side AI
 * 
 * Verifies that:
 * 1. AI integration is server-side only
 * 2. API keys are never exposed to client
 * 3. No AI functions are exported to client code
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Server-Side AI Enforcement', () => {
  const clientDir = path.join(__dirname, '../src/client');
  const serverDir = path.join(__dirname, '../src/server');

  it('should not expose NEBIUS_API_KEY to client code', async () => {
    // Check all client-side files for API key references
    const clientFiles = await walkDir(clientDir);
    
    for (const file of clientFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Client code should not contain API key references
      expect(content).not.toContain('NEBIUS_API_KEY');
      expect(content).not.toContain('process.env.NEBIUS');
    }
  });

  it('should not expose Nebius base URL construction in client', async () => {
    const clientFiles = await walkDir(clientDir);
    
    for (const file of clientFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Should not have direct API URL construction
      expect(content).not.toMatch(/api-nebius\.nvidia\.com/);
      expect(content).not.toMatch(/fetch\(.*chat\/completions/);
    }
  });

  it('should keep AI service imports in server-only code', async () => {
    const aiServicePath = path.join(serverDir, 'services/ai.ts');
    const aiService = fs.readFileSync(aiServicePath, 'utf-8');
    
    // AI service should exist and contain expected server-side logic
    expect(aiService).toContain('generateDiagnosis');
    expect(aiService).toContain('callNemotronAPI');
    expect(aiService).toContain('NEBIUS_API_KEY');
  });

  it('should have proper server/client boundary', async () => {
    // Check that shared types don't expose server internals
    const sharedPath = path.join(__dirname, '../src/shared/types.ts');
    const shared = fs.readFileSync(sharedPath, 'utf-8');
    
    // Shared types should be pure data types, no server logic
    expect(shared).not.toContain('import');
    expect(shared).not.toContain('NEBIUS');
    expect(shared).not.toContain('api key');
  });

  it('should not have client-side AI calls', async () => {
    // Verify no fetch calls to AI endpoints from client
    const clientComponentsDir = path.join(clientDir, 'components');
    const componentFiles = await walkDir(clientComponentsDir);
    
    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Client should only use tRPC, not direct API calls
      expect(content).not.toMatch(/fetch\(.* Nemotron|fetch\(.* nemotron/i);
      expect(content).not.toMatch(/apiKey.*=.*process\.env/);
    }
  });

  it('should have proper environment variable handling', async () => {
    const serverFiles = await walkDir(serverDir);
    
    let foundApiKeyUsage = false;
    
    for (const file of serverFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      
      if (content.includes('NEBIUS_API_KEY')) {
        foundApiKeyUsage = true;
        // Should use process.env, not hardcoded
        expect(content).toMatch(/process\.env\.NEBIUS_API_KEY/);
        // Should NOT have hardcoded key
        expect(content).not.toMatch(/NEBIUS_API_KEY\s*=\s*['"][^'"]+['"]/);
      }
    }

    expect(foundApiKeyUsage).toBe(true); // API key should be used server-side
  });
});

async function walkDir(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...await walkDir(fullPath));
      }
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}
