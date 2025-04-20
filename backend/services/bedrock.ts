import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { ChatMessage } from '../types/chat';

interface ModelConfig {
  temperature: number;
  topP: number;
  maxTokens: number;
  stopSequences?: string[];
}

export class BedrockService {
  private client: BedrockRuntimeClient;
  public models = {
    claude35: "anthropic.claude-3-5-sonnet-20240620-v1:0",
    titanImage: "amazon.titan-image-generator-v1"  // Updated to image generator model
  };

  private readonly defaultConfig: ModelConfig = {
    temperature: 0.7,
    topP: 0.99,
    maxTokens: 3000
  };

  private readonly questionTypeConfigs: { [key: string]: ModelConfig } = {
    factual: {
      temperature: 0.3,  // Lower temperature for more focused, factual responses
      topP: 0.9,
      maxTokens:  3000,
      stopSequences: ["Human:", "Assistant:"]
    },
    analytical: {
      temperature: 0.7,  // Balanced for analytical thinking
      topP: 0.95,
      maxTokens: 3000
    },
    conceptual: {
      temperature: 0.6,  // Moderate temperature for clear explanations
      topP: 0.92,
      maxTokens: 3000
    },
    procedural: {
      temperature: 0.4,  // Lower temperature for precise step-by-step instructions
      topP: 0.9,
      maxTokens: 3000
    },
    clarification: {
      temperature: 0.5,  // Moderate temperature for clear clarifications
      topP: 0.9,
      maxTokens: 3000
    },
    visual: {  // New config for image-related queries
      temperature: 0.4,
      topP: 0.9,
      maxTokens: 3000
    },
    imageGeneration: {  // New config for image generation
      temperature: 0.8,  // Higher temperature for more creative image descriptions
      topP: 0.95,
      maxTokens: 3000
    }
  };

  public chatModel = this.models.claude35;

  private lastTokenUsage = 0;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION,
      systemClockOffset: 0,  // ให้ใช้เวลาจากระบบโดยตรง
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
  }

  async embedImage(imageBase64: string, text?: string): Promise<number[]> {
    try {
      const command = new InvokeModelCommand({
        modelId: this.models.titanImage,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          inputImage: imageBase64,
          ...(text && { inputText: text })
        })
      });

      const response = await this.client.send(command);
      
      if (!response.body) {
        throw new Error("Empty response body");
      }

      const responseData = JSON.parse(new TextDecoder().decode(response.body));
      
      if (!responseData.embedding) {
        throw new Error("No embedding field in the response");
      }

      return responseData.embedding;
    } catch (error) {
      // console.error("Error generating image embedding:", error);
      throw error;
    }
  }

  private detectMessageType(messages: ChatMessage[]): string {
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage.content.toLowerCase();
    const hasImage = lastMessage.images && lastMessage.images.length > 0;
    const hasFiles = lastMessage.files && lastMessage.files.length > 0;

    if (hasFiles || hasImage) return 'visual';
    if (/^(what|when|where|who|which|how many|how much)/i.test(query)) return 'factual';
    if (/^(why|how|what if|analyze|compare|contrast)/i.test(query)) return 'analytical';
    if (/^(explain|describe|define|what is|what are|how does)/i.test(query)) return 'conceptual';
    if (/^(how to|how do|what steps|how can|show me how)/i.test(query)) return 'procedural';
    if (/^(can you clarify|what do you mean|please explain|elaborate)/i.test(query)) return 'clarification';

    return 'factual'; // Default
  }

  private getModelConfig(messages: ChatMessage[]): ModelConfig {
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage.isImageGeneration) {
      return {
        ...this.defaultConfig,
        ...this.questionTypeConfigs.imageGeneration
      };
    }

    const messageType = this.detectMessageType(messages);
    return {
      ...this.defaultConfig,
      ...this.questionTypeConfigs[messageType]
    };
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      const command = new InvokeModelCommand({
        modelId: this.models.titanImage,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          taskType: "TEXT_IMAGE",
          textToImageParams: {
            text: prompt,
            numberOfImages: 1,
            imageHeight: 1024,
            imageWidth: 1024,
            cfgScale: 8.0,
            seed: Math.floor(Math.random() * 1000000)
          },
          imageGenerationConfig: {
            numberOfImages: 1,
            quality: "standard",
            height: 1024,
            width: 1024,
            cfgScale: 8.0
          }
        })
      });

      const response = await this.client.send(command);
      
      if (!response.body) {
        throw new Error("Empty response body");
      }

      const responseData = JSON.parse(new TextDecoder().decode(response.body));
      
      if (!responseData.images || !responseData.images[0]) {
        throw new Error("No image generated");
      }

      return responseData.images[0];
    } catch (error) {
      console.error("Error generating image:", error);
      throw error;
    }
  }

  async *chat(messages: ChatMessage[], modelId: string): AsyncGenerator<string> {
    try {
      const config = this.getModelConfig(messages);
      // console.log('Using model config:', config);

      const lastMessage = messages[messages.length - 1];
      const isImageGeneration = lastMessage.isImageGeneration;

      if (isImageGeneration) {
        try {
          const imageBase64 = await this.generateImage(lastMessage.content);
          yield JSON.stringify({
            type: 'generated-image',
            data: imageBase64
          });
          return;
        } catch (error) {
          console.error("Error in image generation:", error);
          yield "I apologize, but I encountered an error while generating the image. Please try again or contact support if the issue persists.";
          return;
        }
      }

      const command = new InvokeModelWithResponseStreamCommand({
        modelId: this.models.claude35,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          top_p: config.topP,
          stop_sequences: config.stopSequences,
          messages: messages.map(msg => {
            // ตรวจสอบว่ามีไฟล์หรือรูปภาพหรือไม่
            const hasImages = msg.images && msg.images.length > 0;
            const hasFiles = msg.files && msg.files.length > 0;
            
            // ถ้าไม่มีไฟล์หรือรูปภาพ ส่งแค่ข้อความอย่างเดียว
            if (!hasImages && !hasFiles) {
              return {
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
              };
            }
            
            // สร้าง content array แบบ multimodal
            let content = [];
            
            // เพิ่มข้อความหลัก
            content.push({ type: 'text', text: msg.content });
            
            // เพิ่มรูปภาพถ้ามี
            if (hasImages && msg.images) {
              msg.images.forEach(img => {
                content.push({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: img.mediaType,
                    data: img.data
                  }
                });
              });
            }
            
            // เพิ่มข้อมูลไฟล์ถ้ามี
            if (hasFiles && msg.files) {
              msg.files.forEach(file => {
                // เพิ่มชื่อไฟล์
                content.push({ 
                  type: 'text', 
                  text: `\n\n=== File: ${file.name} (${file.mediaType}) ===\n`
                });
                
                // เพิ่มเนื้อหาของไฟล์
                if (file.content) {
                  content.push({
                    type: 'text',
                    text: file.content
                  });
                } else {
                  content.push({
                    type: 'text',
                    text: `[Cannot read file content ${file.name}]`
                  });
                }
                
                content.push({
                  type: 'text',
                  text: '\n=== End of file ===\n'
                });
              });
            }
            
            return {
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: content
            };
          })
        })
      });

      const response = await this.client.send(command);

      if (response.body) {
        let inputTokens = 0;
        let outputTokens = 0;

        for await (const chunk of response.body) {
          if (chunk.chunk?.bytes) {
            const decodedChunk = new TextDecoder().decode(chunk.chunk.bytes);
            try {
              const parsedChunk = JSON.parse(decodedChunk);
              
              if (parsedChunk.type === 'message_start' && parsedChunk.message?.usage?.input_tokens) {
                inputTokens = parsedChunk.message.usage.input_tokens;
              }

              if (parsedChunk.type === 'message_delta' && parsedChunk.usage?.output_tokens) {
                outputTokens = parsedChunk.usage.output_tokens;
              }

              if (parsedChunk.type === 'message_stop' && parsedChunk['amazon-bedrock-invocationMetrics']) {
                const metrics = parsedChunk['amazon-bedrock-invocationMetrics'];
                inputTokens = metrics.inputTokenCount;
                outputTokens = metrics.outputTokenCount;
              }

              if (parsedChunk.type === 'content_block_delta' && 
                  parsedChunk.delta?.type === 'text_delta' && 
                  parsedChunk.delta?.text) {
                yield parsedChunk.delta.text;
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }

        const totalTokens = inputTokens + outputTokens;
        this.lastTokenUsage = totalTokens;

        console.log('[Bedrock] Final token usage:', {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens
        });
      }
    } catch (error) {
      console.error('Claude chat error:', error);
      throw error;
    }
  }

  getLastTokenUsage(): number {
    return this.lastTokenUsage;
  }
}

export const bedrockService = new BedrockService();