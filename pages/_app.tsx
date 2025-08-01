import "./styles/globals.css";
import type { AppProps } from "next/app";

import { Authenticator, View, Image, Text, useTheme, Theme, ThemeProvider } from '@aws-amplify/ui-react';

import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json"
import '@aws-amplify/ui-react/styles.css'

Amplify.configure(outputs);

// Custom CSS for rounded corners
const customStyles = `
  .amplify-authenticator {
    --amplify-components-authenticator-router-border-radius: 16px;
    --amplify-components-button-border-radius: 8px;
    --amplify-components-fieldcontrol-border-radius: 8px;
  }
  .amplify-authenticator [data-amplify-router] {
    border-radius: 16px !important;
    overflow: hidden;
  }
  .amplify-button {
    border-radius: 8px !important;
  }
  .amplify-input, .amplify-field-control {
    border-radius: 8px !important;
  }
`;

const components = {



  Header() {
    const { tokens } = useTheme();

    return (
      <View 
        textAlign="center" 
        backgroundColor="#ffffff" 
        className="rounded-tl-[50px] rounded-tr-[50px] "
      >
        <Image
          alt="ELDI Logo"
          src="/e-logo.png"
          width="50%"
          height="auto"
          objectFit="contain"
        />
      </View>
    );
  },

  Footer() {
    const { tokens } = useTheme();

    return (
      <View 
        textAlign="center" 
        padding={tokens.space.medium}
        backgroundColor="black"
      >
        <Text color="#ffffff" fontSize={tokens.fontSizes.small}>
          &copy; 2025 ELDI Dashboard. All Rights Reserved
        </Text>
      </View>
    );
  },






}

export default function App({ Component, pageProps }: AppProps) {

const { tokens } = useTheme();
  const theme: Theme = {
    name: 'ELDI Auth Theme',
    tokens: {
      colors: {
        background: {
          primary: {
            value: '#f8fafc',
          },
          secondary: {
            value: '#e2e8f0',
          },
        },
        font: {
          interactive: {
            value: '#1e3a5f',
          },
          primary: {
            value: '#1e3a5f',
          },
        },
        border: {
          primary: {
            value: '#cbd5e1',
          },
          secondary: {
            value: '#e2e8f0',
          },
        },
        brand: {
          primary: {
            '10': { value: '#f1f5f9' },
            '20': { value: '#e2e8f0' },
            '40': { value: '#94a3b8' },
            '60': { value: '#1e3a5f' },
            '80': { value: '#1e2d47' },
            '90': { value: '#0f172a' },
            '100': { value: '#020617' },
          },
        },
      },
      components: {
        authenticator: {
          router: {
            backgroundColor: { value: '#ffffff' },
            boxShadow: { value: '0 10px 25px -3px rgba(30, 58, 95, 0.1), 0 4px 6px -2px rgba(30, 58, 95, 0.05)' },
          },
          form: {
            padding: { value: '2rem' },
          },
        },
        button: {
          primary: {
            backgroundColor: { value: '#dc2626' },
            color: { value: '#ffffff' },
            _hover: {
              backgroundColor: { value: '#b91c1c' },
            },
            _focus: {
              backgroundColor: { value: '#b91c1c' },
              boxShadow: { value: '0 0 0 3px rgba(220, 38, 38, 0.3)' },
            },
            _active: {
              backgroundColor: { value: '#991b1b' },
            },
          },
          link: {
            color: { value: '#1e3a5f' },
            _hover: {
              color: { value: '#dc2626' },
            },
          },
        },
        tabs: {
          item: {
            color: { value: '#64748b' },
            _focus: {
              color: { value: '#dc2626' },
            },
            _hover: {
              color: { value: '#1e3a5f' },
            },
            _active: {
              color: { value: '#dc2626' },
              borderColor: { value: '#dc2626' },
            },
          },
        },
        fieldcontrol: {
          borderColor: { value: '#cbd5e1' },
          color: { value: '#1e3a5f' },
          _focus: {
            borderColor: { value: '#dc2626' },
            boxShadow: { value: '0 0 0 3px rgba(220, 38, 38, 0.1)' },
          },
        },
        textfield: {
          color: { value: '#1e3a5f' },
        },
        passwordfield: {
          button: {
            color: { value: '#64748b' },
            _hover: {
              backgroundColor: { value: '#f1f5f9' },
              color: { value: '#1e3a5f' },
            },
            _active: {
              backgroundColor: { value: '#e2e8f0' },
              color: { value: '#1e3a5f' },
            },
            _focus: {
              color: { value: '#1e3a5f' },
            },
          },
        },
        text: {
          color: { value: '#1e3a5f' },
        },
      },
    },
  };

  return (
    <>
      <style jsx global>{customStyles}</style>
      <ThemeProvider theme={theme}>
        <Authenticator className="min-h-screen" components={components}>
          <Component {...pageProps} />
        </Authenticator>
      </ThemeProvider>
    </>
  );
}
